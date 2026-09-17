import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  getSubmission,
  getAssignment,
  getStudent,
  updateSubmission
} from '../../mock/mockReader';
import { percentageToLetterGrade } from '../../utils/letterGrade';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const DEFAULT_CHECKLIST = [
  { criterion: "Addresses the assignment brief's core requirement", weight: 40 },
  { criterion: "Demonstrates clear structure (intro/body/conclusion or equivalent)", weight: 20 },
  { criterion: "Professional quality — grammar, clarity, formatting", weight: 20 },
  { criterion: "Original thinking / goes beyond minimum requirements", weight: 20 }
];

export default function AdminSubmissionReviewPage() {
  const { submissionId } = useParams();
  const { logout } = useAdminAuth();

  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { breakdown: [...], rawScore: number }
  const [finalScore, setFinalScore] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const sub = await getSubmission(submissionId);
        if (!sub) throw new Error("Submission not found");
        
        const [assgn, stu] = await Promise.all([
          getAssignment(sub.assignmentId),
          getStudent(sub.studentId)
        ]);

        setSubmission(sub);
        setAssignment(assgn);
        setStudent(stu);

        if (sub.aiGradeBreakdown) {
          setAiResult({
            breakdown: sub.aiGradeBreakdown,
            rawScore: sub.aiRawScore
          });
          setFinalScore(sub.score?.toString() || '');
        }
      } catch (err) {
        console.error('Error loading submission details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [submissionId]);

  const extractTextFromPdf = async (arrayBuffer) => {
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  };

  const extractTextFromDocx = async (arrayBuffer) => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleCheckWithAI = async () => {
    if (!submission.fileUrl) {
      alert('This submission does not have a file URL attached.');
      return;
    }

    setAiChecking(true);
    try {
      // 1. Fetch file
      const response = await fetch(submission.fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      // 2. Extract Text
      let text = '';
      if (submission.fileName.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPdf(arrayBuffer);
      } else if (submission.fileName.toLowerCase().endsWith('.docx')) {
        text = await extractTextFromDocx(arrayBuffer);
      } else {
        throw new Error('Unsupported file type');
      }

      // 3. Call Groq
      const checklist = assignment.checklist || DEFAULT_CHECKLIST;
      
      const groq = new OpenAI({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        dangerouslyAllowBrowser: true, // same client-side caveat as before — flag this in your summary same as the Anthropic version did
      });

      const basePrompt = `
You are an expert grader. Grade the following submission based on the provided assignment brief and checklist.

Assignment Brief:
${assignment.brief}

Submission Text:
${text}

Checklist criteria and weights:
${JSON.stringify(checklist, null, 2)}

For each criterion, provide a "matchScore" from 0 to 100 representing how well the submission meets it.
Also provide a one sentence "reasoning".

Respond ONLY with valid JSON in the exact following structure, with no markdown formatting or extra text:
{
  "breakdown": [
    { "criterion": "criterion string here", "weight": number, "matchScore": number, "reasoning": "one sentence here" }
  ]
}
      `;

      const extractAndParseJson = (rawContent) => {
        if (!rawContent || typeof rawContent !== 'string') {
          throw new Error('Empty response from AI model');
        }
        let jsonString = rawContent.trim();
        if (jsonString.includes('```json')) {
          jsonString = jsonString.split('```json')[1].split('```')[0];
        } else if (jsonString.includes('```')) {
          jsonString = jsonString.split('```')[1].split('```')[0];
        }
        const parsedData = JSON.parse(jsonString.trim());
        if (!parsedData || !Array.isArray(parsedData.breakdown)) {
          throw new Error('Invalid JSON structure: missing breakdown array');
        }
        return parsedData;
      };

      const modelName = import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-120b';

      const callGroq = async (promptText) => {
        const completion = await groq.chat.completions.create({
          model: modelName,
          temperature: 0,
          messages: [{ role: 'user', content: promptText }]
        });
        return completion.choices[0]?.message?.content || '';
      };

      let parsed = null;
      const initialResponseText = await callGroq(basePrompt);
      try {
        parsed = extractAndParseJson(initialResponseText);
      } catch (firstErr) {
        console.warn('Initial AI response parsing failed, retrying once with strict instructions...', firstErr);
        const retryPrompt = `${basePrompt}\n\nRespond with ONLY the JSON object, no markdown code fences, no explanation text before or after it.`;
        const retryResponseText = await callGroq(retryPrompt);
        try {
          parsed = extractAndParseJson(retryResponseText);
        } catch (secondErr) {
          console.error('AI response parse failed on retry:', secondErr);
          throw new Error('AI grading response could not be parsed — try again or grade manually');
        }
      }
      
      // Calculate total score
      let totalScore = 0;
      const completeBreakdown = parsed.breakdown.map((item) => {
        const criterionDef = checklist.find(c => c.criterion === item.criterion) || item;
        const weight = criterionDef.weight || item.weight;
        totalScore += (item.matchScore * weight) / 100;
        return {
          ...item,
          weight
        };
      });

      const rawScore = Math.round(totalScore);

      setAiResult({
        breakdown: completeBreakdown,
        rawScore
      });
      setFinalScore(rawScore.toString());

    } catch (err) {
      console.error('AI Check failed:', err);
      alert(err.message.includes('AI grading response could not be parsed')
        ? err.message
        : 'Failed to check with AI: ' + err.message);
    } finally {
      setAiChecking(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!finalScore || isNaN(finalScore)) {
      alert('Please enter a valid number for the score.');
      return;
    }
    
    setSaving(true);
    try {
      const numScore = Number(finalScore);
      const isOverride = numScore !== aiResult?.rawScore;
      
      await updateSubmission(submission.id, {
        status: 'graded',
        score: numScore,
        gradedAt: new Date(),
        aiGradeBreakdown: aiResult?.breakdown || null,
        aiRawScore: aiResult?.rawScore || null,
        gradedBy: isOverride ? 'admin_override' : 'ai'
      });
      
      // Update local state to show it's graded
      setSubmission(prev => ({
        ...prev,
        status: 'graded',
        score: numScore
      }));
      alert('Grade saved successfully.');
    } catch (err) {
      console.error('Error saving grade:', err);
      alert('Failed to save grade.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-thrive-sand flex items-center justify-center">
        <p className="text-sm text-thrive-ink/50">Loading submission...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-thrive-sand flex items-center justify-center">
        <p className="text-sm text-red-500">{error || 'Submission not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-thrive-sand pb-12">
      <header className="bg-white border-b border-thrive-line sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/admin/cohorts/${submission.cohortId}`} className="text-thrive-ink/60 hover:text-thrive-ink transition text-sm">
              ← Back to Cohort
            </Link>
            <span className="text-thrive-line">|</span>
            <span className="font-display font-semibold text-lg text-thrive-ink">
              Review Submission
            </span>
          </div>
          <button
            onClick={logout}
            className="text-sm font-medium text-thrive-ink/70 hover:text-thrive-ink transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 mt-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-thrive-line p-6 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-thrive-ink mb-4">Submission Details</h2>
              <dl className="grid grid-cols-1 gap-y-4 text-sm">
                <div>
                  <dt className="text-thrive-ink/60 font-medium">Student</dt>
                  <dd className="text-thrive-ink mt-1">{student?.name || 'Unknown'} ({student?.email || submission.studentId})</dd>
                </div>
                <div>
                  <dt className="text-thrive-ink/60 font-medium">Assignment (Week {submission.weekNumber})</dt>
                  <dd className="text-thrive-ink mt-1 font-medium">{assignment?.title}</dd>
                  <dd className="text-thrive-ink/70 mt-1">{assignment?.brief}</dd>
                </div>
                <div>
                  <dt className="text-thrive-ink/60 font-medium">File</dt>
                  <dd className="mt-1">
                    {submission.fileUrl ? (
                      <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-thrive-accent hover:underline">
                        {submission.fileName}
                      </a>
                    ) : (
                      <span className="text-thrive-ink">{submission.fileName} (No URL available)</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-thrive-ink/60 font-medium">Submitted</dt>
                  <dd className="text-thrive-ink mt-1">
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-thrive-line p-6 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-thrive-ink mb-4">AI Grading</h2>
              
              {!aiResult ? (
                <div className="text-center py-6">
                  <p className="text-sm text-thrive-ink/70 mb-4">Use AI to analyze the submission against the assignment rubric.</p>
                  <button
                    onClick={handleCheckWithAI}
                    disabled={aiChecking || !submission.fileUrl}
                    className="w-full py-2 px-4 bg-thrive-accent text-white rounded-lg font-medium hover:bg-thrive-accent/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {aiChecking ? (
                      <span className="animate-pulse">Checking...</span>
                    ) : (
                      '✨ Check with AI'
                    )}
                  </button>
                  {!submission.fileUrl && (
                    <p className="text-xs text-red-500 mt-2">This submission predates file storage — ask the student to resubmit.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {aiResult.breakdown.map((item, idx) => (
                      <div key={idx} className="border-b border-thrive-line pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-medium text-thrive-ink/80 pr-4">{item.criterion}</span>
                          <span className="text-xs font-semibold text-thrive-accent whitespace-nowrap">
                            {item.matchScore} / 100 (w: {item.weight})
                          </span>
                        </div>
                        <p className="text-xs text-thrive-ink/60 italic">{item.reasoning}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-thrive-line">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-thrive-ink">AI Computed Total</span>
                      <span className="font-display text-lg font-semibold text-thrive-ink">
                        {aiResult.rawScore}% &middot; {percentageToLetterGrade(aiResult.rawScore)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-thrive-ink/70">Final Score:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={finalScore}
                          onChange={(e) => setFinalScore(e.target.value)}
                          className="w-20 px-2 py-1 text-right border border-thrive-line rounded-md focus:outline-none focus:border-thrive-accent"
                        />
                        <span className="font-display font-semibold text-thrive-ink">
                          % &middot; {finalScore && !isNaN(finalScore) ? percentageToLetterGrade(Number(finalScore)) : '-'}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSaveGrade}
                      disabled={saving}
                      className="mt-4 w-full py-2 px-4 bg-thrive-sage text-white rounded-lg font-medium hover:bg-thrive-sage/90 disabled:opacity-50 transition"
                    >
                      {saving ? 'Saving...' : 'Save Grade'}
                    </button>
                    
                    {submission.status === 'graded' && (
                      <p className="text-xs text-thrive-sage text-center mt-2 font-medium">
                        ✓ Grade saved
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

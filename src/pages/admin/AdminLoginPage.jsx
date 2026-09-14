import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export default function AdminLoginPage() {
  const { admin, loginWithGoogle, adminError } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (admin) {
      navigate('/admin', { replace: true });
    }
  }, [admin, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-thrive-sand p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-thrive-line p-8">
        <h1 className="text-2xl font-display font-semibold text-thrive-ink text-center mb-6">
          Admin Portal Login
        </h1>
        
        {adminError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm">
            {adminError}
          </div>
        )}

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-thrive-line rounded-lg hover:bg-thrive-sand/50 transition"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
            className="w-5 h-5"
          />
          <span className="font-medium text-thrive-ink">Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}

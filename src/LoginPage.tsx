import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Leaf,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { loginWithGoogle } from "./api";
import type { Config } from "./types";
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.7Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-1 6.8-2.5l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.8a6 6 0 0 1 0-3.6V7.5H3a10 10 0 0 0 0 9l3.4-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.7C7.2 7.9 9.4 6.1 12 6.1Z"
      />
    </svg>
  );
}
function authError(error: unknown, developer = false) {
  switch ((error as { code?: string }).code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Continue with Google whenever you’re ready.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow popups for this site and try again.";
    case "auth/unauthorized-domain":
      return developer
        ? "Add this website to Firebase Authentication’s authorized domains."
        : "Google sign-in is unavailable for this website. Please contact the studio administrator.";
    case "auth/operation-not-allowed":
      return developer
        ? "Enable Google as a sign-in provider in Firebase Authentication."
        : "Google sign-in is currently unavailable. Please contact the studio administrator.";
    case "auth/network-request-failed":
      return "We couldn’t reach Google. Check your connection and try again.";
    default:
      return developer
        ? "Google sign-in could not be completed. Check the Firebase setup and try again."
        : "Google sign-in could not be completed. Please try again.";
  }
}
export default function LoginPage({ config }: { config: Config }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = Boolean(
    config.firebase?.apiKey &&
    config.firebase?.authDomain &&
    config.firebase?.projectId,
  );
  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      await loginWithGoogle();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(authError(e, config.showDeveloperSetup));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link to="/login" className="auth-wordmark">
          <span className="logo">
            <Leaf size={23} />
          </span>
          <span>
            Asenso<span> One</span>
            <small>STUDIO</small>
          </span>
        </Link>
        <div className="auth-story-body">
          <div className="auth-eyebrow">FOR THE BUSINESS OF YOU</div>
          <h1>
            Big ideas.
            <br />
            Your own
            <br />
            <em>little studio.</em>
          </h1>
          <p>
            A home for your brand, the stories you create,
            <br />
            and the people your work reaches.
          </p>
          <div className="auth-story-steps">
            <span>
              <Check size={15} /> Find your voice
            </span>
            <span>
              <Check size={15} /> Create with purpose
            </span>
            <span>
              <Check size={15} /> Grow at your pace
            </span>
          </div>
          <div className="auth-note">
            <span>A NOTE TO YOUR FUTURE SELF</span>
            <strong>
              Start small.
              <br />
              Make it yours.
            </strong>
            <Leaf size={23} />
          </div>
        </div>
        <div className="auth-story-footer">
          ASENSO ONE STUDIO <span>YOUR BRAND, IN MOTION.</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-topline">
          YOUR NEXT CHAPTER STARTS HERE <Sparkles size={15} />
        </div>
        <div className="auth-form-content">
          <div className="eyebrow">A LITTLE FOCUS. A LOT OF POSSIBILITY.</div>
          <h2>
            Make room for
            <br />
            what’s next.
          </h2>
          <p>
            Build a personal brand that feels like you.
            <br />
            Your account and private studio start with Google.
          </p>
          <button
            className="google-signin-button"
            disabled={!ready || busy}
            onClick={submit}
          >
            <GoogleMark />
            <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
            {!busy && <ArrowRight size={17} />}
          </button>
          <p className="auth-first-time">
            First time here? Your account is created automatically when you
            continue with Google.
          </p>
          <div className="auth-privacy">
            <ShieldCheck size={19} />
            <div>
              <strong>Your own space, from day one.</strong>
              <span>
                Your brand, drafts, and uploads stay in your account’s
                workspace. Google Sheets connection is a separate step.
              </span>
            </div>
          </div>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          {!ready && (
            <div className="auth-setup-status" role="status">
              {config.showDeveloperSetup
                ? "Google sign-in needs one-time project setup. The button becomes available when Firebase is configured."
                : "Google sign-in is temporarily unavailable. Please contact the studio administrator."}
            </div>
          )}
          {config.showDeveloperSetup && (
            <details className="auth-setup" open={!ready}>
              <summary>Google sign-in setup</summary>
              <ol>
                <li>
                  Create a Firebase web app and enable{" "}
                  <strong>Authentication → Google</strong>.
                </li>
                <li>
                  Add <strong>localhost</strong> and your deployed domain to
                  Authorized domains.
                </li>
                <li>
                  Set <code>FIREBASE_WEB_CONFIG</code> in the backend{" "}
                  <code>.env</code> to the web app’s Firebase configuration
                  JSON.
                </li>
                <li>
                  Restart the backend. Firebase web configuration is separate
                  from your Gemini API key.
                </li>
              </ol>
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open Firebase console <ArrowUpRight size={13} />
              </a>
            </details>
          )}
          {config.demo && (
            <Link className="auth-demo-link" to="/dashboard">
              Just looking? Explore the sample studio <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
        <div className="auth-bottomline">
          MADE FOR A BUSINESS OF ONE.
          <span>Built for everything you can become.</span>
        </div>
      </section>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import api, { getApiErrorMessage } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";

const RESET_TYPE_EMAIL = 1;

const RESET_STEPS = [
  {
    icon: Icon.User,
    title: "Enter username",
    description: "Use the username linked to your account.",
  },
  {
    icon: Icon.EnvelopeSimple,
    title: "Check your email",
    description: "We send a verification code to reset your password.",
  },
  {
    icon: Icon.LockKey,
    title: "Set a new password",
    description: "Enter the code and choose a secure new password.",
  },
] as const;

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUserName = userName.trim();
    if (!trimmedUserName) {
      toast.error("Please enter your username.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v2/Account/SendForgotPasswordEmail", {
        UserName: trimmedUserName,
      });
      setStep(2);
      toast.success("Verification code sent successfully!");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to send verification code."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUserName = userName.trim();
    const trimmedCode = code.trim();
    const password = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!trimmedUserName || !trimmedCode || !password || !confirm) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      toast.error("Password and confirm password do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v2/Account/ResetPassword", {
        UserName: trimmedUserName,
        Password: password,
        ConfirmPassword: confirm,
        Code: trimmedCode,
        ResetType: RESET_TYPE_EMAIL,
      });
      toast.success("Password reset successful!");
      router.push("/login");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Reset failed. Please check your code or password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb
          heading="Forget your password"
          subHeading="Forget your password"
        />
      </div>

      <section className="forgot-pass auth-page md:py-20 py-10">
        <div className="container px-4 sm:px-6">
          <div className="auth-page-card">
            <div className="auth-page-grid">
              <div className="auth-page-form">
                <span className="auth-page-badge">Account Recovery</span>
                <h1 className="auth-page-title heading3">
                  {step === 1 ? "Reset your password" : "Verify & reset"}
                </h1>
                <p className="auth-page-subtitle caption1 text-secondary">
                  {step === 1
                    ? "Enter your username and we will send you a verification code."
                    : "Enter the code you received and choose a new password."}
                </p>

                <div className="auth-step-indicator" aria-hidden="true">
                  <span
                    className={`auth-step-bar ${step >= 1 ? "is-active" : ""}`}
                  />
                  <span
                    className={`auth-step-bar ${step >= 2 ? "is-active" : ""}`}
                  />
                </div>

                {step === 1 ? (
                  <form className="auth-form" onSubmit={handleSendOTP}>
                    <div className="auth-field">
                      <label htmlFor="username" className="auth-label">
                        Username
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.User size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-submit">
                      <button
                        title="Submit"
                        type="submit"
                        className="button-main bg-black text-white cursor-pointer hover:text-black transition-all duration-300"
                        disabled={loading}
                      >
                        {loading ? "Sending code..." : "Send Verification Code"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={handleResetPassword}>
                    <div className="auth-field">
                      <label htmlFor="otp" className="auth-label">
                        Verification Code
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.ShieldCheck
                          size={18}
                          className="auth-input-icon"
                        />
                        <input
                          className="auth-input"
                          id="otp"
                          type="text"
                          placeholder="Enter code from email"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label htmlFor="newPassword" className="auth-label">
                        New Password
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.Lock size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="newPassword"
                          type="password"
                          placeholder="Min. 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label htmlFor="confirmPassword" className="auth-label">
                        Confirm Password
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.LockKey size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-forgot">
                      <button
                        type="button"
                        className="auth-forgot-link"
                        onClick={() => setStep(1)}
                      >
                        Back to username
                      </button>
                    </div>

                    <div className="auth-submit">
                      <button
                        title="Reset Password"
                        type="submit"
                        className="button-main bg-black text-white cursor-pointer hover:text-black transition-all duration-300"
                        disabled={loading}
                      >
                        {loading ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </form>
                )}

                <p className="auth-back-login caption1 text-secondary">
                  Remember your password?{" "}
                  <Link href="/login" className="auth-inline-link">
                    Sign in
                  </Link>
                </p>
              </div>

              <aside className="auth-page-aside">
                <div className="auth-aside-content">
                  <h2 className="auth-aside-title">How it works</h2>
                  <p className="auth-aside-text">
                    Follow these simple steps to securely reset your password
                    and regain access to your account.
                  </p>

                  <ul className="auth-benefits">
                    {RESET_STEPS.map((item, index) => {
                      const StepIcon = item.icon;
                      const isActive = step === index + 1;
                      const isDone = step > index + 1;

                      return (
                        <li
                          key={item.title}
                          className={`auth-benefit-item ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
                        >
                          <span className="auth-benefit-icon">
                            <StepIcon size={18} weight="duotone" />
                          </span>
                          <div>
                            <p className="auth-benefit-title">{item.title}</p>
                            <p className="auth-benefit-desc">
                              {item.description}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="auth-aside-action">
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="button-main cursor-pointer transition-all duration-300"
                    >
                      Back to Sign In
                    </button>
                  </div>

                  <p className="auth-aside-footnote caption2 text-secondary">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="auth-inline-link">
                      Create one
                    </Link>
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default ForgotPassword;

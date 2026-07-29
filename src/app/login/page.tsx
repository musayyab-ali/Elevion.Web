"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api";
import { loginWithCredentials } from "@/lib/auth";

const REGISTER_BENEFITS = [
  {
    icon: Icon.Gift,
    title: "Exclusive offers",
    description: "Get access to member-only deals and promotions.",
  },
  {
    icon: Icon.Package,
    title: "Faster checkout",
    description: "Save your details for a smoother shopping experience.",
  },
  {
    icon: Icon.Star,
    title: "Personalized picks",
    description: "Enjoy recommendations tailored to your preferences.",
  },
] as const;

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (searchParams?.get("expired") === "1") {
      setError("Your session has expired. Please login again.");
      toast.error("Session expired. Please login again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials(username.trim(), password.trim());

      toast.success("Login successful!");
      const redirectTo = searchParams?.get("redirect") || "/";
      router.push(redirectTo);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { ExceptionType?: string; Message?: string } };
      };
      const errorData = errObj.response?.data;
      const exceptionType = errorData?.ExceptionType;

      setUsername("");
      setPassword("");

      if (exceptionType === "UserNotFoundException") {
        toast.error("User does not exist!");
        setError("User does not exist!");
      } else if (exceptionType === "IncorrectPasswordException") {
        toast.error("Incorrect password!");
        setError("Incorrect password!");
      } else {
        const message = getApiErrorMessage(
          err,
          errorData?.Message || "Login failed.",
        );
        toast.error(message);
        setError(message);
      }
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
        <Breadcrumb heading="Login" subHeading="Login" />
      </div>

      <section className="login-block auth-page md:py-20 py-10">
        <div className="container px-4 sm:px-6">
          <div className="auth-page-card">
            <div className="auth-page-grid">
              <div className="auth-page-form">
                <span className="auth-page-badge">Welcome Back</span>
                <h1 className="auth-page-title heading3">Sign in to your account</h1>
                <p className="auth-page-subtitle caption1 text-secondary">
                  Enter your credentials to access your orders, wishlist, and
                  account settings.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                  {error && (
                    <div className="auth-alert is-error" role="alert">
                      <Icon.WarningCircle size={18} weight="fill" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="auth-alert is-success" role="status">
                      <Icon.CheckCircle size={18} weight="fill" />
                      <span>{success}</span>
                    </div>
                  )}

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
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="password" className="auth-label">
                      Password
                    </label>
                    <div className="auth-input-wrap">
                      <Icon.Lock size={18} className="auth-input-icon" />
                      <input
                        className="auth-input"
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-forgot">
                    <button
                      title="Forgot Your Password?"
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="auth-forgot-link"
                    >
                      Forgot your password?
                    </button>
                  </div>

                  <div className="auth-submit">
                    <button
                      title="Login Your Account"
                      type="submit"
                      className="button-main bg-black text-white cursor-pointer hover:text-black transition-all duration-300"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </button>
                  </div>
                </form>
              </div>

              <aside className="auth-page-aside">
                <div className="auth-aside-content">
                  <h2 className="auth-aside-title">New customer?</h2>
                  <p className="auth-aside-text">
                    Join us today and unlock exclusive benefits, offers, and a
                    personalized shopping experience.
                  </p>

                  <ul className="auth-benefits">
                    {REGISTER_BENEFITS.map((item) => {
                      const BenefitIcon = item.icon;
                      return (
                        <li key={item.title} className="auth-benefit-item">
                          <span className="auth-benefit-icon">
                            <BenefitIcon size={18} weight="duotone" />
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
                      title="Go to Registration Page"
                      onClick={() => router.push("/register")}
                      className="button-main cursor-pointer transition-all duration-300"
                    >
                      Create Account
                    </button>
                  </div>
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

export default Login;

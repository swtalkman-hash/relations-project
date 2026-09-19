import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { WelcomeModal } from "./components/WelcomeModal";
import { AuthPage } from "./pages/Auth";
import { DashboardPage } from "./pages/Dashboard";
import { InvestPage } from "./pages/Invest";
import { WheelPage } from "./pages/Wheel";
import { DepositPage } from "./pages/Deposit";
import { TeamPage } from "./pages/Team";
import { TasksPage } from "./pages/Tasks";
import { PricesPage } from "./pages/Prices";
import { ProfilePage } from "./pages/Profile";
import { TransactionsPage } from "./pages/Transactions";
import { AboutPage } from "./pages/About";
import { SeedHelperPage } from "./pages/SeedHelper";
import { WithdrawPage } from "./pages/Withdraw";
import { Logo } from "./components/Logo";

const WORKER_URL = "https://green-cherry-9667.qmzpownxf091.workers.dev/";

function AnnouncementBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(() => {
    const isWorker = typeof window !== "undefined" && window.location.hostname.includes("workers.dev");
    const dismissed = localStorage.getItem("banner_dismissed_v1") === "1";
    return !isWorker && !dismissed;
  });

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem("banner_dismissed_v1", "1");
    setVisible(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "linear-gradient(90deg, #b8860b, #d4af37)",
      color: "#080810", padding: "10px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 8, fontSize: 13, fontWeight: 700,
      boxShadow: "0 2px 12px rgba(0,0,0,0.4)"
    }}>
      <span style={{ flex: 1, textAlign: "right" }}>
        📢 إذا كان التطبيق لا يعمل معك، استخدم الرابط البديل:{" "}
        <a href={WORKER_URL} style={{ color: "#080810", textDecoration: "underline" }}>
          اضغط هنا
        </a>
      </span>
      <button onClick={dismiss} style={{
        background: "rgba(0,0,0,0.2)", border: "none", color: "#080810",
        borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 900, fontSize: 15
      }}>✕</button>
    </div>
  );
}

function PrivateApp(): React.ReactElement {
  return (
    <Layout>
      <WelcomeModal />
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/invest" component={InvestPage} />
        <Route path="/wheel" component={WheelPage} />
        <Route path="/deposit" component={DepositPage} />
        <Route path="/withdraw" component={WithdrawPage} />
        <Route path="/team" component={TeamPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/prices" component={PricesPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/about" component={AboutPage} />
        <Route><DashboardPage /></Route>
      </Switch>
    </Layout>
  );
}

function Splash(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse"><Logo size="lg" /></div>
    </div>
  );
}

function Root(): React.ReactElement {
  const { user, loading } = useAuth();
  const [loc] = useLocation();

  useEffect(() => {
    document.title = "Safe investment";
  }, []);

  if (loc === "/seed-helper") return <SeedHelperPage />;

  if (loading) return <Splash />;
  if (!user) {
    const isSignup = loc === "/signup" || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ref"));
    return <AuthPage initialMode={isSignup ? "signup" : "login"} />;
  }
  return <PrivateApp />;
}

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <AnnouncementBanner />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Root />
      </WouterRouter>
    </AuthProvider>
  );
}

export default App;

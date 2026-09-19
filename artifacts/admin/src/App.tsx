import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { AdminAuthProvider, useAdminAuth } from "./lib/auth";
import { PendingProvider } from "./lib/pending";
import { AdminLayout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { UsersPage } from "./pages/Users";
import { UserDetailPage } from "./pages/UserDetail";
import { DepositsPage } from "./pages/Deposits";
import { WithdrawalsPage } from "./pages/Withdrawals";
import { SettingsPage } from "./pages/Settings";

function AppRoutes(): React.ReactElement {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--color-gold)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return (
      <Switch>
        <Route path="*" component={LoginPage} />
      </Switch>
    );
  }

  return (
    <PendingProvider>
      <AdminLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/users/:id" component={UserDetailPage} />
          <Route path="/deposits" component={DepositsPage} />
          <Route path="/withdrawals" component={WithdrawalsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route>
            <div className="text-center py-20 text-[var(--color-muted)]">الصفحة غير موجودة</div>
          </Route>
        </Switch>
      </AdminLayout>
    </PendingProvider>
  );
}

export default function App(): React.ReactElement {
  const base = (import.meta.env.BASE_URL ?? "/admin/").replace(/\/$/, "");
  document.title = "Admin";
  return (
    <AdminAuthProvider>
      <WouterRouter base={base}>
        <AppRoutes />
      </WouterRouter>
    </AdminAuthProvider>
  );
}

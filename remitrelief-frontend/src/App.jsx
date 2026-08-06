import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import CampaignList from "./pages/CampaignList";
import CampaignDetail from "./pages/CampaignDetail";
import DonorDashboard from "./pages/DonorDashboard";
import Ledger from "./pages/Ledger";
import VerifyPage from "./pages/VerifyPage";
import CreateCampaign from "./pages/CreateCampaign";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <WalletProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<CampaignList />} />
              <Route path="campaigns/:id" element={<CampaignDetail />} />
              <Route path="create" element={<CreateCampaign />} />
              <Route path="dashboard" element={<DonorDashboard />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="verify" element={<VerifyPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </WalletProvider>
  );
}

import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ScannerPage from "./pages/ScannerPage";
import InventoryPage from "./pages/InventoryPage";
import BoxesPage from "./pages/BoxesPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ScannerPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/boxes" element={<BoxesPage />} />
      </Routes>
    </Layout>
  );
}

export default App;

import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ScannerPage from './pages/ScannerPage'
import InventoryPage from './pages/InventoryPage'
import BoxesPage from './pages/BoxesPage'
import BomPage from './pages/BomPage'
import { Toaster } from '@/components/ui/toaster'

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<ScannerPage/>}/>
                <Route path="/inventory" element={<InventoryPage/>}/>
                <Route path="/boxes" element={<BoxesPage/>}/>
                <Route path="/bom" element={<BomPage/>}/>
            </Routes>
            <Toaster/>
        </Layout>
    )
}

export default App

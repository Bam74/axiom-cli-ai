import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell.tsx'
import { SourceProvider } from './components/ui.tsx'
import { CustomerPage, CustomerRecordPage, PropertyCustomersPage, ThemePage, WaterPage } from './pages/CustomerPage.tsx'
import { ManagementPage } from './pages/ManagementPage.tsx'
import { OverviewPage } from './pages/OverviewPage.tsx'
import { ProjectWorkspacePage, ProjectsPage } from './pages/ProjectsPage.tsx'
import { LeadPage, SalesManagementPage, SalesPage, SalesSignalPage } from './pages/SalesPage.tsx'
import { SourcesPage } from './pages/SourcesPage.tsx'
import { DataProvider } from './state/data.tsx'
import { DemoProvider } from './state/demo.tsx'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <DataProvider>
        <DemoProvider>
          <SourceProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<ProjectWorkspacePage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="sales/management" element={<SalesManagementPage />} />
                <Route path="sales/project/:projectId" element={<SalesSignalPage />} />
                <Route path="sales/:leadId" element={<LeadPage />} />
                <Route path="customer" element={<CustomerPage />} />
                <Route path="customer/property/:projectId/:theme" element={<PropertyCustomersPage />} />
                <Route path="customer/person/:customerId" element={<CustomerRecordPage />} />
                <Route path="customer/theme/:theme" element={<ThemePage />} />
                <Route path="customer/water" element={<WaterPage />} />
                <Route path="management" element={<ManagementPage />} />
                <Route path="sources" element={<SourcesPage />} />
              </Route>
            </Routes>
          </SourceProvider>
        </DemoProvider>
      </DataProvider>
    </BrowserRouter>
  )
}

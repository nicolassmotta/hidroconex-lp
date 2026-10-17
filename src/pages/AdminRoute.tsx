import { Toaster } from "@/components/ui/sonner";
import Seo from "@/components/Seo";
import AdminPage from "./Admin";

// Carregado sob demanda pelo App: o código do painel não pesa nas páginas públicas.
const AdminRoute = () => (
  <>
    <Toaster />
    <Seo
      title="Painel Hidroconex"
      description="Área administrativa da Hidroconex."
      path="/admin"
      robots="noindex,nofollow"
    />
    <AdminPage />
  </>
);

export default AdminRoute;

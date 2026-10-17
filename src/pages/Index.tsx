import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  defaultSeo,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={defaultSeo.title}
        description={defaultSeo.description}
        path="/"
        structuredData={[organizationSchema(), localBusinessSchema(), websiteSchema()]}
      />
      <Header isHome />
      <main>
        <Hero />
        <Products />
        <About />
        <Location />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;

import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <Layout showSidebar={false}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-legacy-primary mb-2">Terms of Service</h1>
          <p className="text-legacy-ink/70">Last updated: September 12, 2025</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Agreement to Terms</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              By accessing or using LegacyText AI, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Description of Service</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              LegacyText AI is a journaling platform that allows users to create and organize personal entries via SMS, with AI-powered categorization and export capabilities for creating legacy journals.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">User Accounts</h2>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized use</li>
              <li>One account per person is permitted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Acceptable Use</h2>
            <p className="text-legacy-ink/80 leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Submit content that is harmful, threatening, or offensive</li>
              <li>Attempt to gain unauthorized access to the service</li>
              <li>Interfere with the operation of the service</li>
              <li>Submit false or misleading information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Content Ownership</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              You retain ownership of all content you submit to LegacyText AI. By using our service, you grant us a limited license to process, store, and organize your content for the purpose of providing our journaling service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Payment Terms</h2>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>Premium features require payment as specified</li>
              <li>All payments are processed securely through third-party providers</li>
              <li>Refunds are handled on a case-by-case basis</li>
              <li>Prices may change with notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Service Availability</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              We strive to maintain service availability but cannot guarantee uninterrupted access. We reserve the right to modify or discontinue the service with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Limitation of Liability</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              LegacyText AI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Termination</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, your right to use the service will cease, and we may delete your account and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Changes to Terms</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Contact Information</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              For questions about these Terms of Service, please contact us at legal@legacytext.ai
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;
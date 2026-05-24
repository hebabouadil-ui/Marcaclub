export const metadata = { title: 'Privacy Policy — Marcaclub' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-gray-900 tracking-widest uppercase mb-2">Privacy Policy</h1>
      <p className="text-gray-400 text-sm mb-10">Last updated: May 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
          <p>When you create an account or place an order, we collect your name, email address, phone number, and shipping address. If you sign in with Google or Facebook, we receive your name and email from those providers.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process and fulfill your orders</li>
            <li>To send order confirmation and shipping updates</li>
            <li>To manage your account and order history</li>
            <li>To improve our website and services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Payment Information</h2>
          <p>All payments are processed securely by Stripe. We do not store your card number or payment details on our servers.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Sharing Your Information</h2>
          <p>We do not sell or share your personal information with third parties, except as necessary to fulfill your order (e.g. shipping carriers) or as required by law.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Cookies</h2>
          <p>We use cookies to keep you signed in and to remember your cart and currency preference. We do not use tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Your Rights</h2>
          <p>You may request deletion of your account and personal data at any time by contacting us. You can also sign out and clear your data from your account settings.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Contact</h2>
          <p>For any privacy-related questions, contact us at <a href="mailto:support@marca-club.com" className="text-brand-gold hover:underline">support@marca-club.com</a>.</p>
        </section>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Bot, Leaf, ShoppingBag, GraduationCap, Users, Shield } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl text-gray-900">Smart Cow Waste Cleaning Robot</span>
            </div>
            <Link to="/login">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-6">
                Login / Register
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6">
              <Shield className="w-4 h-4" />
              <span>AI-Powered Agricultural Innovation</span>
            </div>
            <h1 className="text-5xl text-gray-900 mb-6">
              Revolutionizing Farm Waste Management
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Our intelligent robotic system combines machine learning and automation to efficiently clean cow waste, 
              manage composting, and connect agricultural communities through an integrated platform.
            </p>
            <div className="flex gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-8">
                  Get Started
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50">
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1646082275982-025ccc59bd2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWlyeSUyMGZhcm0lMjBjb3d8ZW58MXx8fHwxNzYyMzIzODUyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Smart farming technology"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 border border-purple-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Waste Cleaned</div>
                  <div className="text-2xl text-gray-900">98.5%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl text-gray-900 mb-4">Complete Agricultural Ecosystem</h2>
          <p className="text-xl text-gray-600">Integrated platform for farmers, processors, and traders</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Bot className="w-8 h-8" />}
            title="Automated Robot Control"
            description="Simulate and monitor waste collection with real-time tracking, daily statistics, tank fill monitoring, and detailed collection history with PDF export"
            color="from-blue-500 to-blue-600"
          />
          <FeatureCard
            icon={<ShoppingBag className="w-8 h-8" />}
            title="Marketplace"
            description="Buy and sell cow waste, compost, and fertilizer materials directly through our platform"
            color="from-purple-500 to-purple-600"
          />
          <FeatureCard
            icon={<GraduationCap className="w-8 h-8" />}
            title="Educational Content"
            description="Access comprehensive guides on farming, composting, waste management, and sustainable practices"
            color="from-indigo-500 to-indigo-600"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Community Forum"
            description="Connect with other farmers, share experiences, and discuss best practices in agriculture"
            color="from-violet-500 to-violet-600"
          />
          <FeatureCard
            icon={<Leaf className="w-8 h-8" />}
            title="Compost Management"
            description="Tools for compost processors to manage products and share expertise with the community"
            color="from-green-500 to-green-600"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Secure Platform"
            description="Role-based access control ensures data security and appropriate permissions for all users"
            color="from-teal-500 to-teal-600"
          />
        </div>
      </section>

      {/* User Roles Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl text-gray-900 mb-4">Built for Every Role</h2>
          <p className="text-xl text-gray-600">Tailored dashboards for farmers, processors, sellers, buyers, and administrators</p>
        </div>
        
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          <RoleCard title="Farmer" description="Control robots & monitor cleaning" />
          <RoleCard title="Compost Processor" description="Manage compost products" />
          <RoleCard title="Seller" description="List products for sale" />
          <RoleCard title="Buyer" description="Purchase farm materials" />
          <RoleCard title="Admin" description="Platform management" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl text-white mb-6">Ready to Transform Your Farm?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the future of sustainable agriculture with AI-powered waste management
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 rounded-full px-10">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-lg font-semibold">SmartCow</span>
              </div>
              <p className="text-sm text-gray-400">Revolutionizing farm waste management with AI technology</p>
            </div>
            <div>
              <h4 className="text-white mb-3 font-semibold">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/marketplace" className="hover:text-white transition-colors">
                    Marketplace
                  </Link>
                </li>
                <li>
                  <span className="text-gray-500">Robot Control</span>
                  <span className="text-xs text-gray-600 ml-2">(Farmer Dashboard)</span>
                </li>
                <li>
                  <span className="text-gray-500">Education</span>
                  <span className="text-xs text-gray-600 ml-2">(Login Required)</span>
                </li>
                <li>
                  <span className="text-gray-500">Forum</span>
                  <span className="text-xs text-gray-600 ml-2">(Login Required)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white mb-3 font-semibold">About</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Demo Application</li>
                <li>Smart Waste Management</li>
                <li>AI-Powered Solutions</li>
                <li>Agricultural Technology</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white mb-3 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Login / Register
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace" className="hover:text-white transition-colors">
                    Browse Marketplace
                  </Link>
                </li>
                <li className="text-gray-500">
                  <span>Contact: </span>
                  <span className="text-gray-400">support@smartcow.com</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Smart Cow Waste Cleaning Robot. All rights reserved.</p>
            <p className="mt-2 text-xs text-gray-500">This is a demonstration application for educational purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-purple-100 hover:shadow-xl transition-shadow">
      <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function RoleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl p-6 border-2 border-purple-200 hover:border-purple-400 transition-colors text-center">
      <h3 className="text-lg text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}


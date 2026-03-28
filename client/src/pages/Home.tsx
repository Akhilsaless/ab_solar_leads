import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Sun, Zap, TrendingUp, MapPin, Phone, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyAddress: "",
    city: "",
    state: "",
    zipCode: "",
    monthlyEnergyBill: "",
    roofCondition: "",
    roofAge: "",
    sunExposure: "",
    installationTimeline: "exploring",
    homeownershipType: "",
  });

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead submitted successfully! We'll contact you soon.");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        propertyAddress: "",
        city: "",
        state: "",
        zipCode: "",
        monthlyEnergyBill: "",
        roofCondition: "",
        roofAge: "",
        sunExposure: "",
        installationTimeline: "exploring",
        homeownershipType: "",
      });
      setCurrentStep(1);
    },
    onError: (error) => {
      toast.error("Failed to submit lead. Please try again.");
      console.error(error);
    },
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    createLeadMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      propertyAddress: formData.propertyAddress,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      monthlyEnergyBill: formData.monthlyEnergyBill ? parseInt(formData.monthlyEnergyBill) : undefined,
      roofCondition: formData.roofCondition as any,
      roofAge: formData.roofAge ? parseInt(formData.roofAge) : undefined,
      sunExposure: formData.sunExposure as any,
      installationTimeline: formData.installationTimeline as any,
      homeownershipType: formData.homeownershipType as any,
    });
  };

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Sun className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gradient">AB SOLAR</span>
          </div>
          {isAuthenticated ? (
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
              Dashboard
            </Button>
          ) : (
            <Button asChild>
              <a href={getLoginUrl()}>Admin Login</a>
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden section-padding">
        <div className="absolute inset-0 gradient-solar opacity-10 blur-3xl"></div>
        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-fade-in-up">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Go <span className="text-gradient">Solar</span> Today
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Join thousands of homeowners saving money with solar energy. Get your personalized quote in minutes and discover how much you can save.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-lg">Free solar assessment</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-lg">No installation costs</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-lg">Save up to 30% on energy</span>
                </div>
              </div>

              <Button size="lg" className="btn-primary gap-2">
                Get Your Free Quote <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Right Visual */}
            <div className="relative h-96 lg:h-full">
              <div className="absolute inset-0 gradient-solar rounded-2xl opacity-20 blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 border border-primary/30 flex items-center justify-center h-full">
                <div className="text-center">
                  <Sun className="w-32 h-32 text-primary mx-auto mb-4 animate-pulse-glow" />
                  <p className="text-2xl font-bold">Clean Energy</p>
                  <p className="text-muted-foreground">For Your Home</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-card border-y border-border">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose AB SOLAR?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Instant Savings",
                description: "Start saving on your energy bills from day one with our efficient solar systems.",
              },
              {
                icon: TrendingUp,
                title: "Proven Results",
                description: "Average customers save $10,000+ over 10 years with our solar solutions.",
              },
              {
                icon: MapPin,
                title: "Local Experts",
                description: "Our team knows your area's climate and regulations to maximize your savings.",
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="card-elevated p-8 text-center hover:shadow-glow transition-all">
                  <Icon className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lead Capture Form Section */}
      <section className="section-padding">
        <div className="container max-w-2xl">
          <h2 className="text-4xl font-bold text-center mb-4">Get Your Free Solar Assessment</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Answer a few quick questions to get your personalized solar savings estimate
          </p>

          <Card className="card-elevated p-8 md:p-12">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in-up">
                  <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        className="input-field mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        className="input-field mt-2"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="input-field mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className="input-field mt-2"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Property Details */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in-up">
                  <h3 className="text-2xl font-bold mb-6">Property Details</h3>
                  
                  <div>
                    <Label htmlFor="propertyAddress">Property Address</Label>
                    <Input
                      id="propertyAddress"
                      name="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={handleInputChange}
                      placeholder="123 Main Street"
                      className="input-field mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="San Francisco"
                        className="input-field mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="CA"
                        className="input-field mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="94102"
                        className="input-field mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="roofCondition">Roof Condition</Label>
                      <Select value={formData.roofCondition} onValueChange={(value) => handleSelectChange("roofCondition", value)}>
                        <SelectTrigger className="input-field mt-2">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="roofAge">Roof Age (years)</Label>
                      <Input
                        id="roofAge"
                        name="roofAge"
                        type="number"
                        value={formData.roofAge}
                        onChange={handleInputChange}
                        placeholder="10"
                        className="input-field mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sunExposure">Sun Exposure</Label>
                    <Select value={formData.sunExposure} onValueChange={(value) => handleSelectChange("sunExposure", value)}>
                      <SelectTrigger className="input-field mt-2">
                        <SelectValue placeholder="Select exposure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Sun</SelectItem>
                        <SelectItem value="partial">Partial Sun</SelectItem>
                        <SelectItem value="shaded">Shaded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 3: Energy & Preferences */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in-up">
                  <h3 className="text-2xl font-bold mb-6">Energy & Preferences</h3>
                  
                  <div>
                    <Label htmlFor="monthlyEnergyBill">Monthly Energy Bill ($)</Label>
                    <Input
                      id="monthlyEnergyBill"
                      name="monthlyEnergyBill"
                      type="number"
                      value={formData.monthlyEnergyBill}
                      onChange={handleInputChange}
                      placeholder="150"
                      className="input-field mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="installationTimeline">Installation Timeline</Label>
                      <Select value={formData.installationTimeline} onValueChange={(value) => handleSelectChange("installationTimeline", value)}>
                        <SelectTrigger className="input-field mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate (Next 30 days)</SelectItem>
                          <SelectItem value="3-6months">3-6 Months</SelectItem>
                          <SelectItem value="6-12months">6-12 Months</SelectItem>
                          <SelectItem value="exploring">Just Exploring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="homeownershipType">Homeownership Type</Label>
                      <Select value={formData.homeownershipType} onValueChange={(value) => handleSelectChange("homeownershipType", value)}>
                        <SelectTrigger className="input-field mt-2">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owned">Owned</SelectItem>
                          <SelectItem value="financed">Financed</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">By submitting, you agree to receive communications from AB SOLAR</p>
                      <p className="text-sm text-muted-foreground mt-1">We'll send you personalized solar savings estimates and follow-up information.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="btn-primary flex-1"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createLeadMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {createLeadMutation.isPending ? "Submitting..." : "Get My Free Quote"}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-primary to-secondary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Saving?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of homeowners already enjoying clean, affordable solar energy
          </p>
          <Button size="lg" variant="secondary" className="gap-2">
            Get Started Now <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sun className="w-6 h-6 text-primary" />
                <span className="font-bold">AB SOLAR</span>
              </div>
              <p className="text-muted-foreground text-sm">Making solar energy accessible to everyone.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> 1-800-SOLAR-1
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> info@absolar.com
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 AB SOLAR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

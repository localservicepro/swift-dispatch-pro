import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Home, 
  Target, 
  ShoppingCart, 
  Package, 
  Users, 
  CreditCard, 
  Truck, 
  Users2, 
  Mail, 
  Settings,
  MapPin,
  Smartphone,
  HelpCircle,
  BookOpen,
  Play,
  FileText,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KnowledgebaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  role?: "admin" | "driver" | "all";
}

const knowledgebaseData: KnowledgebaseItem[] = [
  // Getting Started
  {
    id: "login",
    title: "How to Log In",
    content: `
**Login Process:**
1. Enter your email address and password on the login screen
2. Click "Sign In" to access the system
3. You'll be redirected to your dashboard based on your role

**Forgot Password:**
1. Click "Forgot Password?" on the login screen
2. Enter your email address
3. Check your email for reset instructions
4. Follow the link to set a new password

**First Time Login:**
- Contact your administrator to get your login credentials
- Change your password after first login for security
    `,
    category: "Getting Started",
    tags: ["login", "password", "authentication"],
    role: "all"
  },
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    content: `
**Dashboard Features:**
- **Key Metrics:** View total orders, revenue, active customers, and pending deliveries
- **Recent Orders:** Quick access to the most recent order activity
- **Performance Charts:** Visual representation of business performance
- **Quick Actions:** Fast access to common tasks like creating orders

**Navigation:**
- Use the sidebar (desktop) or bottom navigation (mobile) to switch between sections
- Click on any metric card to drill down into detailed views

**Customization:**
- Dashboard refreshes automatically to show real-time data
- Use filters to view data for specific time periods
    `,
    category: "Getting Started",
    tags: ["dashboard", "overview", "metrics"],
    role: "admin"
  },

  // Order Management
  {
    id: "create-order",
    title: "Creating New Orders",
    content: `
**Step-by-Step Order Creation:**

1. **Customer Selection:**
   - Search for existing customer or create new one
   - Fill in customer contact information

2. **Delivery Address:**
   - Enter delivery address with Google Maps integration
   - Verify address accuracy for successful deliveries

3. **Product Selection:**
   - Browse products by category or search
   - Add products to cart with quantities
   - View real-time stock levels

4. **Delivery Details:**
   - Choose delivery method (delivery or pickup)
   - Select delivery date and time slot
   - Assign specific truck if needed

5. **Payment Information:**
   - Choose payment method (cash, card, account)
   - Apply any discounts or special pricing
   - Review total cost

6. **Review & Submit:**
   - Verify all order details
   - Add any special notes
   - Submit order for processing

**Tips:**
- Use the floating cart to track items as you build the order
- Save incomplete orders as drafts
- Use bulk pricing for large orders
    `,
    category: "Order Management",
    tags: ["order", "create", "customer", "delivery"],
    role: "admin"
  },
  {
    id: "edit-order",
    title: "Editing Orders",
    content: `
**Editing Existing Orders:**

**Order Status Considerations:**
- **Pending Orders:** Can be fully edited
- **Confirmed Orders:** Limited editing available
- **In Transit:** Contact information and delivery notes only
- **Completed:** No editing allowed

**What You Can Edit:**
- Customer contact information
- Delivery address and time
- Product quantities (if not yet allocated)
- Payment method and notes
- Special delivery instructions

**How to Edit:**
1. Find the order in Order Management
2. Click the edit button (pencil icon)
3. Modify the required fields
4. Save changes

**Conflict Detection:**
- System will warn about scheduling conflicts
- Stock allocation conflicts are flagged
- Address validation ensures deliverable locations

**Order Splitting:**
- Split large orders across multiple deliveries
- Maintain customer relationship across split orders
- Track all parts of split orders together
    `,
    category: "Order Management",
    tags: ["order", "edit", "modify", "status"],
    role: "admin"
  },
  {
    id: "order-tracking",
    title: "Order Tracking & Status",
    content: `
**Order Status Workflow:**
1. **Pending:** Newly created, awaiting confirmation
2. **Confirmed:** Approved and ready for allocation
3. **Allocated:** Products assigned, ready for dispatch
4. **In Transit:** Out for delivery
5. **Delivered:** Successfully completed
6. **Cancelled:** Order cancelled

**Tracking Features:**
- Real-time status updates
- Delivery time estimates
- Driver location tracking
- Customer notifications

**Status Updates:**
- Automatic updates when drivers scan orders
- Manual status changes for exceptions
- Email notifications to customers

**Delivery Confirmation:**
- Photo proof of delivery
- Customer signature capture
- GPS location verification
- Time stamped completion
    `,
    category: "Order Management",
    tags: ["tracking", "status", "delivery", "updates"],
    role: "all"
  },

  // Product Management
  {
    id: "add-products",
    title: "Adding Products",
    content: `
**Product Information Required:**
- **Basic Details:** Name, description, SKU
- **Pricing:** Base price, special pricing tiers
- **Inventory:** Stock levels, reorder points
- **Categories:** Product categorization for easy browsing
- **Images:** Product photos for identification

**Step-by-Step:**
1. Go to Product Management
2. Click "Add Product"
3. Fill in all required fields
4. Upload product images
5. Set inventory levels
6. Configure pricing rules
7. Save the product

**Best Practices:**
- Use clear, descriptive product names
- Include detailed descriptions
- Upload high-quality images
- Set accurate stock levels
- Use consistent categorization

**Bulk Import:**
- Use CSV templates for bulk product uploads
- Validate data before importing
- Review imported products for accuracy
    `,
    category: "Product Management",
    tags: ["product", "add", "inventory", "pricing"],
    role: "admin"
  },
  {
    id: "inventory-management",
    title: "Inventory Management",
    content: `
**Stock Tracking:**
- Real-time stock level monitoring
- Low stock alerts and notifications
- Stock allocation for pending orders
- Historical stock movement tracking

**Stock Updates:**
- Manual stock adjustments
- Automated deductions on order confirmation
- Stock returns processing
- Damage/loss reporting

**Inventory Alerts:**
- Low stock warnings
- Out of stock notifications
- Overstock alerts
- Reorder recommendations

**Stock Reports:**
- Current inventory levels
- Stock movement history
- Turnover analysis
- Dead stock identification

**Best Practices:**
- Regular stock audits
- Set appropriate reorder levels
- Monitor fast-moving items
- Plan for seasonal variations
    `,
    category: "Product Management",
    tags: ["inventory", "stock", "alerts", "tracking"],
    role: "admin"
  },

  // Customer Management
  {
    id: "customer-profiles",
    title: "Managing Customer Profiles",
    content: `
**Customer Information:**
- **Personal Details:** Name, contact information
- **Addresses:** Multiple delivery addresses
- **Payment Methods:** Saved payment options
- **Order History:** Complete purchase history
- **Preferences:** Delivery preferences, notes

**Creating Customer Profiles:**
1. Go to Customer Management
2. Click "Add Customer"
3. Enter contact information
4. Add delivery addresses
5. Set payment preferences
6. Add any special notes

**Customer Features:**
- Multiple contact persons per account
- Credit limit management
- Special pricing agreements
- Delivery preferences
- Order history tracking

**Customer Segmentation:**
- Categorize by customer type
- Set different pricing tiers
- Apply volume discounts
- Track customer loyalty

**Data Import:**
- Bulk customer import via CSV
- Contact validation
- Duplicate detection
- Data cleansing tools
    `,
    category: "Customer Management",
    tags: ["customer", "profile", "contact", "import"],
    role: "admin"
  },

  // Payment Management
  {
    id: "payment-processing",
    title: "Payment Processing",
    content: `
**Payment Methods:**
- **Cash:** Traditional cash payments
- **Card:** Credit/debit card processing
- **Account:** Customer account billing
- **Invoice:** Send invoices for later payment

**Processing Payments:**
1. Select payment method during order creation
2. For card payments, use integrated payment terminal
3. For invoices, system generates and emails automatically
4. Track payment status in Payment Management

**Payment Status:**
- **Pending:** Payment initiated but not completed
- **Paid:** Payment successfully processed
- **Failed:** Payment attempt failed
- **Refunded:** Payment returned to customer

**Payment Features:**
- Partial payments support
- Payment splitting across methods
- Automatic receipt generation
- Payment history tracking

**Security:**
- PCI compliant payment processing
- Encrypted payment data
- Secure card storage
- Fraud detection
    `,
    category: "Payment Management",
    tags: ["payment", "processing", "invoice", "card"],
    role: "admin"
  },

  // Fleet Management
  {
    id: "truck-management",
    title: "Fleet Management",
    content: `
**Truck Information:**
- Vehicle details and specifications
- Capacity and load limits
- Driver assignments
- Maintenance schedules
- Route optimization

**Adding Trucks:**
1. Go to Fleet Management
2. Click "Add Truck"
3. Enter vehicle details
4. Set capacity limits
5. Assign driver
6. Configure delivery zones

**Truck Assignment:**
- Manual assignment for specific routes
- Automatic assignment based on location
- Load optimization algorithms
- Driver preference matching

**Fleet Monitoring:**
- Real-time truck locations
- Delivery progress tracking
- Performance metrics
- Maintenance alerts

**Route Optimization:**
- Multi-stop route planning
- Traffic consideration
- Delivery time windows
- Fuel efficiency optimization
    `,
    category: "Fleet Management",
    tags: ["truck", "fleet", "driver", "routes"],
    role: "admin"
  },

  // Team Management
  {
    id: "team-roles",
    title: "Team Roles & Permissions",
    content: `
**User Roles:**

**Administrator:**
- Full system access
- User management
- System configuration
- Reports and analytics

**Driver:**
- Delivery management
- Order status updates
- Route navigation
- Customer interaction

**Manager:**
- Order oversight
- Team performance
- Customer service
- Inventory monitoring

**Adding Team Members:**
1. Go to Team Management
2. Click "Add Team Member"
3. Enter user details
4. Assign role and permissions
5. Send invitation email

**Permission Management:**
- Role-based access control
- Feature-specific permissions
- Geographic restrictions
- Time-based access

**Activity Monitoring:**
- User activity logs
- Performance tracking
- Login history
- Security monitoring
    `,
    category: "Team Management",
    tags: ["team", "roles", "permissions", "users"],
    role: "admin"
  },

  // Driver Portal
  {
    id: "driver-app",
    title: "Driver Mobile App",
    content: `
**Driver Dashboard Features:**
- Daily delivery schedule
- Route optimization
- Customer contact information
- Order details and special instructions

**Delivery Workflow:**
1. View assigned deliveries
2. Optimize route using GPS navigation
3. Update order status during transit
4. Capture delivery confirmation
5. Mark orders as completed

**Delivery Confirmation:**
- Take photo proof of delivery
- Collect customer signature
- Note any delivery issues
- GPS timestamp verification

**Communication:**
- Contact customers directly
- Message dispatch team
- Report delivery issues
- Request assistance

**Performance Tracking:**
- Delivery success rate
- On-time performance
- Customer feedback
- Route efficiency

**Mobile Features:**
- Offline capability
- GPS navigation
- Camera integration
- Push notifications
    `,
    category: "Mobile Guide",
    tags: ["driver", "mobile", "delivery", "app"],
    role: "driver"
  },

  // Email Management
  {
    id: "email-automation",
    title: "Email Automation",
    content: `
**Automated Email Types:**
- **Order Confirmation:** Sent when order is created
- **Delivery Updates:** Status change notifications
- **Payment Confirmations:** Receipt emails
- **Delivery Confirmation:** Proof of delivery emails

**Email Templates:**
- Customizable message templates
- Company branding integration
- Dynamic content insertion
- Multi-language support

**Email Settings:**
1. Go to Email Management
2. Configure SMTP settings
3. Customize email templates
4. Set automation rules
5. Test email delivery

**Best Practices:**
- Keep messages clear and concise
- Include all relevant order information
- Provide customer service contact
- Test emails before going live

**Delivery Tracking:**
- Email open rates
- Click-through tracking
- Bounce monitoring
- Unsubscribe management
    `,
    category: "Email Management",
    tags: ["email", "automation", "templates", "notifications"],
    role: "admin"
  },

  // Troubleshooting
  {
    id: "common-issues",
    title: "Common Issues & Solutions",
    content: `
**Login Problems:**
- **Issue:** Can't remember password
- **Solution:** Use "Forgot Password" link on login page

- **Issue:** Account locked
- **Solution:** Contact administrator to unlock account

**Order Issues:**
- **Issue:** Can't find customer
- **Solution:** Check spelling, search by phone number or email

- **Issue:** Address not found
- **Solution:** Use Google Maps integration, verify address format

**Payment Problems:**
- **Issue:** Card payment declined
- **Solution:** Try different payment method, check card details

- **Issue:** Invoice not generating
- **Solution:** Verify customer email address, check email settings

**System Performance:**
- **Issue:** Slow loading
- **Solution:** Refresh browser, check internet connection

- **Issue:** Features not working
- **Solution:** Clear browser cache, try different browser

**Mobile App Issues:**
- **Issue:** GPS not working
- **Solution:** Enable location permissions, restart app

- **Issue:** Photos not uploading
- **Solution:** Check camera permissions, try smaller image size
    `,
    category: "Troubleshooting",
    tags: ["issues", "problems", "solutions", "help"],
    role: "all"
  }
];

const categories = [
  { id: "getting-started", name: "Getting Started", icon: Home },
  { id: "order-management", name: "Order Management", icon: ShoppingCart },
  { id: "product-management", name: "Product Management", icon: Package },
  { id: "customer-management", name: "Customer Management", icon: Users },
  { id: "payment-management", name: "Payment Management", icon: CreditCard },
  { id: "fleet-management", name: "Fleet Management", icon: Truck },
  { id: "team-management", name: "Team Management", icon: Users2 },
  { id: "email-management", name: "Email Management", icon: Mail },
  { id: "mobile-guide", name: "Mobile Guide", icon: Smartphone },
  { id: "troubleshooting", name: "Troubleshooting", icon: HelpCircle },
];

export default function Knowledgebase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openSections, setOpenSections] = useState<string[]>(["getting-started"]);
  const navigate = useNavigate();

  const filteredItems = knowledgebaseData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
                           item.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedItems = categories.reduce((acc, category) => {
    const categoryKey = category.id;
    acc[categoryKey] = filteredItems.filter(item => 
      item.category.toLowerCase().replace(/\s+/g, "-") === categoryKey
    );
    return acc;
  }, {} as Record<string, KnowledgebaseItem[]>);

  const toggleSection = (categoryId: string) => {
    setOpenSections(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Knowledge Base</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Browse Topics</CardTitle>
                <CardDescription>
                  Find guides and documentation by category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guides..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className="w-full justify-start"
                  >
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className="w-full justify-start"
                    >
                      <category.icon className="h-4 w-4 mr-2" />
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Welcome Section */}
              {searchTerm === "" && selectedCategory === "all" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-primary" />
                      Welcome to SwiftDispatch Pro
                    </CardTitle>
                    <CardDescription>
                      Your comprehensive guide to using the order management system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => setSelectedCategory("getting-started")}
                      >
                        <Home className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <div className="font-medium">Getting Started</div>
                          <div className="text-sm text-muted-foreground">
                            Learn the basics and get up to speed quickly
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => setSelectedCategory("order-management")}
                      >
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <div className="font-medium">Order Management</div>
                          <div className="text-sm text-muted-foreground">
                            Create, edit, and track orders efficiently
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => setSelectedCategory("mobile-guide")}
                      >
                        <Smartphone className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <div className="font-medium">Mobile Guide</div>
                          <div className="text-sm text-muted-foreground">
                            Driver app and mobile features
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => setSelectedCategory("troubleshooting")}
                      >
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <div className="font-medium">Troubleshooting</div>
                          <div className="text-sm text-muted-foreground">
                            Common issues and solutions
                          </div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search Results Info */}
              {(searchTerm !== "" || selectedCategory !== "all") && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredItems.length} article{filteredItems.length !== 1 ? 's' : ''} found
                    </span>
                    {selectedCategory !== "all" && (
                      <Badge variant="secondary">
                        {categories.find(c => c.id === selectedCategory)?.name}
                      </Badge>
                    )}
                  </div>
                  {(searchTerm !== "" || selectedCategory !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}

              {/* Content Categories */}
              {categories.map((category) => {
                const categoryItems = groupedItems[category.id];
                if (!categoryItems || categoryItems.length === 0) return null;

                return (
                  <Card key={category.id}>
                    <Collapsible
                      open={openSections.includes(category.id)}
                      onOpenChange={() => toggleSection(category.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <category.icon className="h-5 w-5 text-primary" />
                              {category.name}
                              <Badge variant="secondary" className="ml-2">
                                {categoryItems.length}
                              </Badge>
                            </CardTitle>
                            {openSections.includes(category.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            {categoryItems.map((item, index) => (
                              <div key={item.id}>
                                {index > 0 && <Separator />}
                                <div className="py-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-medium text-lg">{item.title}</h3>
                                    {item.role && item.role !== "all" && (
                                      <Badge variant="outline" className="ml-2">
                                        {item.role}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="prose prose-sm max-w-none text-muted-foreground">
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: item.content
                                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                          .replace(/\n\n/g, '</p><p>')
                                          .replace(/\n/g, '<br>')
                                          .replace(/^/, '<p>')
                                          .replace(/$/, '</p>')
                                      }}
                                    />
                                  </div>
                                  {item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                      {item.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}

              {/* No Results */}
              {filteredItems.length === 0 && (searchTerm !== "" || selectedCategory !== "all") && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No articles found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search terms or browse all categories
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("all");
                      }}
                    >
                      View All Articles
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
# FormFlow - Dynamic Form Builder

A powerful, user-friendly form builder application similar to JotForm, built with Next.js, TypeScript, and Prisma. Create, customize, share, and analyze forms with an intuitive drag-and-drop interface.

## ✨ Features

### 🎨 Form Builder
- **Visual Form Editor**: Intuitive drag-and-drop interface for building forms
- **Real-time Preview**: Switch between edit and preview modes instantly
- **Field Types**: Support for text, email, number, select, textarea, and more
- **Form Validation**: Built-in validation with customizable error messages
- **Responsive Design**: Forms automatically adapt to different screen sizes

### 🎭 Theme System
- **Dynamic Theming**: Change colors, fonts, and sizes with CSS variables
- **Tag-based Styling**: Apply themes based on custom tags and categories
- **Dark/Light Mode**: Automatic theme switching with user preferences
- **Custom Palettes**: Define custom color schemes and gradients
- **Typography Control**: Adjust font families, sizes, and weights

### 🔐 Authentication & Security
- **Secure Authentication**: Powered by Better Auth with session management
- **Protected Routes**: Middleware protection for authenticated pages
- **Password Protection**: Optional password protection for shared forms
- **Token-based Sharing**: Secure form sharing with expirable tokens

### 📊 Analytics & Responses
- **Response Collection**: Real-time response gathering and storage
- **Response Viewer**: Detailed response inspection with download options
- **Analytics Dashboard**: Track form performance and response metrics
- **Export Options**: Download responses as CSV or JSON
- **Completion Tracking**: Monitor form completion times and rates

### 🚀 Sharing & Distribution
- **Public Sharing**: Generate shareable links with customizable settings
- **Expiry Control**: Set expiration dates for shared forms
- **Access Control**: Password protection and token validation
- **QR Code Generation**: Easy mobile access via QR codes

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Custom CSS Variables
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **Validation**: Zod
- **Deployment**: Vercel-ready configuration

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd formflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/formflow"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key"
   BETTER_AUTH_URL="http://localhost:3000"

   # Next.js
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client and push schema
   npx prisma generate
   npx prisma db push

   # (Optional) Seed the database
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
formflow/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── forms/                # Form CRUD operations
│   │   └── share/                # Public form sharing
│   ├── components/               # React components
│   │   ├── theme/                # Theme system
│   │   ├── SiteHeader.tsx        # Navigation header
│   │   ├── OwnerDashboard.tsx    # Dashboard component
│   │   └── FormBuilder.tsx       # Form editor
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Authentication config
│   ├── prisma.ts                 # Database client
│   └── validation.ts             # Zod schemas
├── prisma/                       # Database schema
│   └── schema.prisma             # Prisma schema
├── public/                       # Static assets
└── middleware.ts                 # Next.js middleware
```

## 🎨 Theme System

The application uses a sophisticated theme system based on CSS variables:

### Theme Structure
```typescript
interface ThemePalette {
  // Surfaces
  surfaces: {
    panel: string;
    card: string;
    overlay: string;
  };

  // Text colors
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };

  // Borders and accents
  border: {
    subtle: string;
  };

  accent: {
    primary: string;
    secondary: string;
  };

  // Shadows and effects
  shadows: {
    xl: string;
    lg: string;
  };

  // Flashlights (dynamic gradients)
  flashlights: FlashlightColor[];
}
```

### Using Themes
Themes are applied using CSS custom properties and can be changed dynamically:

```css
:root {
  --surface-panel: #ffffff;
  --text-primary: #000000;
  --accent-primary: #3b82f6;
}
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes Prisma generation and DB push)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📊 Database Schema

The application uses the following main entities:

- **User**: Authentication and user management
- **Form**: Form metadata and configuration
- **Field**: Individual form fields with validation rules
- **FormResponse**: Submitted form responses
- **FormShare**: Share tokens and settings

## 🔐 Authentication

The app uses Better Auth for secure authentication with:
- Email/password login
- Session management
- Protected routes
- CSRF protection

## 🚀 Deployment

### Vercel Deployment

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Prisma commands run automatically during build

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the server**
   ```bash
   npm run start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Prisma](https://prisma.io/) - Database ORM
- [Better Auth](https://better-auth.com/) - Authentication library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [JotForm](https://jotform.com/) - Inspiration for the form builder concept

## 📞 Support

For support, email support@formflow.com or join our Discord community.

---

Built with ❤️ using Next.js and TypeScript

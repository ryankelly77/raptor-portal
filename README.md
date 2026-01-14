# Raptor Vending - Infrastructure Installation Progress Tracker

A React-based progress tracking application for property managers to monitor Smart Fridge™ + Smart Cooker™ infrastructure installations.

## Features

- **5-Phase Timeline Tracking**
  1. Site Assessment & Planning (cellular signal verification)
  2. Employee Preference Survey (snacks & meal customization)
  3. Electrical Preparation (property responsibility)
  4. System Installation & Integration (approximate dates)
  5. Testing, Stocking & Launch

- **Real-time Progress Visualization**
- **Equipment Status Tracking**
- **Survey Results Display**
- **Property Responsibility Notices**
- **Mobile-Responsive Design**
- **Print-friendly output**

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Deployment to Subdomain

### Option 1: Static Hosting (Recommended for simplicity)

1. **Build the production version:**
   ```bash
   npm run build
   ```

2. **Upload the `build` folder contents** to your subdomain hosting:
   - Subdomain example: `progress.raptor-vending.com`
   - Upload all files from the `/build` directory to the subdomain root

### Option 2: Deploy to Netlify (Free & Easy)

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Configure custom domain: `progress.raptor-vending.com`

### Option 3: Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Configure custom domain in Vercel dashboard

### Option 4: Self-Hosted (cPanel/Apache)

1. Build the project: `npm run build`
2. Upload `build` folder contents to subdomain directory
3. Create `.htaccess` in subdomain root:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

## DNS Configuration

Add a CNAME or A record for your subdomain:

```
progress.raptor-vending.com  CNAME  your-hosting-provider.com
```

Or if using an IP:
```
progress.raptor-vending.com  A  123.456.789.0
```

## Customizing Project Data

The project data is currently stored in the `sampleProject` object in `src/App.js`. 

For production use, you'll want to:

1. **Create an API endpoint** that returns project data by ID
2. **Modify the App component** to fetch data:

```javascript
// Example API integration
const [project, setProject] = useState(null);
const projectId = new URLSearchParams(window.location.search).get('id');

useEffect(() => {
  fetch(`/api/projects/${projectId}`)
    .then(res => res.json())
    .then(data => setProject(data));
}, [projectId]);
```

3. **Access via URL**: `progress.raptor-vending.com?id=RV-2025-0147`

## Project Structure

```
raptor-progress-app/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main component with all sub-components
│   ├── App.css         # Component-specific styles
│   ├── index.js        # Entry point
│   └── index.css       # Global styles
├── package.json
└── README.md
```

## Brand Colors

- **Primary Orange:** #FF580F
- **Primary Black:** #202020
- **Text Secondary:** #555
- **Background Light:** #fafafa

## Support

Questions? Contact the development team or refer to the Raptor Vending brand guidelines.

---

**Raptor Vending** - Food Infrastructure for Modern Workplaces

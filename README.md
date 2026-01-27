# MacTube Expense Manager

A beautiful, modern expense management platform designed for music management companies. Built with vanilla HTML, CSS, and JavaScript - no dependencies required.

![MacTube Expense Manager](https://img.shields.io/badge/Version-1.0.0-6366f1) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 📊 Dashboard
- Real-time expense overview with quick statistics
- Visual charts showing expenses by artist and type
- Recent activity feed

### 💰 Expense Management
- Add expenses with detailed categorization
- Categories: Artist → Project → Expense Type
- Track investor (MacTube vs Third Parties)
- 8 expense types: Fuel, Food, Accommodation, Equipment, Production, Promotion, Transport, Other
- Edit and delete existing expenses

### 📈 Reports
- Advanced filtering by artist, project, and investor
- Search functionality across all expense data
- Summary cards showing filtered totals
- Export to Excel (CSV) with proper Portuguese encoding
- Export to PDF for printing

### 💸 Settlement Calculations
- Visual representation of investment distribution
- Calculate who owes whom
- Per-project breakdown
- Easy-to-understand balance indicators

### 🎨 Design
- Clean, modern UI inspired by Sleep Diary
- Fully responsive design (works on mobile, tablet, desktop)
- SVG icons throughout (no emojis)
- Purple/grey color scheme
- Smooth animations and transitions

## 🚀 Getting Started

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mactube-expense-manager.git
   ```

2. Open `index.html` in your browser

That's it! No build process, no dependencies, no server required.

### Local Development Server (Optional)
If you want live reload during development:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (if you have it)
npx serve .

# Using PHP
php -S localhost:8080
```

Then open http://localhost:8080

## 📁 Project Structure

```
mactube-expense-manager/
├── index.html      # Main HTML structure
├── styles.css      # All styling (Sleep Diary inspired)
├── app.js          # Application logic
├── README.md       # This file
└── LICENSE         # MIT License
```

## 🎯 Demo Mode

The application comes with demo data pre-loaded:
- 3 artists with multiple projects
- 10 sample expenses across different categories
- Ready to explore all features immediately

**Login:** Use any email (it's a mockup demo)

## 📱 Responsive Design

- **Desktop:** Full features with side-by-side layouts
- **Tablet:** Adapted grid layouts
- **Mobile:** Single column, touch-friendly buttons

## 🔧 Customization

### Adding New Artists/Projects
Click the "+" buttons next to the dropdown fields in the expense form.

### Data Persistence
All data is stored in browser localStorage:
- `mactube_expenses` - All expense records
- `mactube_categories` - Artists and their projects

### Changing Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary: #6366f1;      /* Main purple */
    --primary-dark: #4f46e5;
    --primary-light: #818cf8;
    --success: #10b981;      /* Green for "Other" investor */
    --warning: #f59e0b;
    --error: #ef4444;
}
```

## 🌍 Internationalization

Currently in Portuguese (PT). Key strings are in `app.js` and can be easily translated.

## 📊 Export Formats

### Excel (CSV)
- UTF-8 with BOM for Portuguese characters
- Includes all expense details
- Summary totals at the bottom

### PDF
- Opens browser print dialog
- Formatted report with summary
- Ready for printing or saving as PDF

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspired by the Sleep Diary project
- Icons from Lucide (inline SVGs)
- Font: Inter (Google Fonts)

---

Made with ❤️ for MacTube Music Management

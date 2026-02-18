(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        updateAllThemeIcons();
        injectDarkStyles(); 
    });
})();

window.toggleTheme = function() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    updateAllThemeIcons();
    
    // optionel hadi
    if (typeof Calendar !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
    }
};


function updateAllThemeIcons() {
    const isDark = document.body.classList.contains('dark-mode');
    const buttons = document.querySelectorAll('.theme-btn'); 
    
    buttons.forEach(btn => {
        if (isDark) {
            btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            btn.style.borderColor = '#ffd700';
            btn.style.color = '#ffd700';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            btn.style.borderColor = 'var(--primary)'; 
            btn.style.color = 'var(--primary)';
        }
    });
}
function injectDarkStyles() {
    if (document.getElementById('dark-mode-patch')) return;
    
    const style = document.createElement('style');
    style.id = 'dark-mode-patch';
    style.textContent = `
        /* Fix the White Section Backgrounds in Dark Mode */
        body.dark-mode .bg-white, 
        body.dark-mode .info-section.bg-white {
            background-color: #121212 !important;
            color: #e0e0e0 !important;
        }

        /* Fix Header/Navbar Background - Stylish Dark Grey */
        body.dark-mode .landing-nav,
        body.dark-mode .dashboard-topbar {
            background-color: #222222 !important;
            border-bottom: 1px solid #333 !important;
            color: #ffffff !important;
        }

        body.dark-mode .nav-links a {
            color: #e0e0e0 !important;
        }

        body.dark-mode .logo {
            color: #ffffff !important;
        }

        /* Fix the "Special Card" (White Card) turning invisible */
        body.dark-mode .special-card {
            background: #1e1e1e !important;
            border-color: #333 !important;
        }
        
        /* Ensure Headings are visible on dark backgrounds */
        body.dark-mode h2, 
        body.dark-mode h3, 
        body.dark-mode .section-title,
        body.dark-mode .glowing-name {
            color: #ffffff !important;
        }

        /* Fix Subtitles and Paragraphs */
        body.dark-mode p, 
        body.dark-mode .about-subtitle {
            color: #bbbbbb !important;
        }
    `;
    document.head.appendChild(style);
}
document.addEventListener('DOMContentLoaded', function() {
  // Menu toggling functionality
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-links');
  
  if (toggle && nav) {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      nav.classList.toggle('show');
    });
  }
  
  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    if (nav.classList.contains('show') && 
        !nav.contains(event.target) && 
        event.target !== toggle) {
      nav.classList.remove('show');
    }
  });

  // Silver page functionality
  const links = document.querySelectorAll('.silver-types a');
  const sections = document.querySelectorAll('.silver-section');
  const backBtn = document.getElementById('backToTop');

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const id = link.dataset.target;
      document.getElementById(id).scrollIntoView({behavior: 'smooth', block: 'start'});
      links.forEach(l => l.classList.remove('silver-active'));
      link.classList.add('silver-active');
    });
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => {
          l.classList.toggle('silver-active', l.dataset.target === id);
        });
      }
    });
  }, {rootMargin: "-20% 0px -70% 0px", threshold: 0});

  sections.forEach(s => observer.observe(s));

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) { 
      backBtn.classList.add('silver-show'); 
    } else { 
      backBtn.classList.remove('silver-show'); 
    }
  });
  
  backBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
});
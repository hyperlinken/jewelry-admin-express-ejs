// window.addEventListener('load', function() {
//         const toggle = document.getElementById('menu-toggle');
//         const nav = document.getElementById('nav-links');
        
//         if (toggle && nav) {
//             toggle.addEventListener('click', function() {
//                 nav.classList.toggle('show');
//                 console.log("Working!");
//             });
//         }
//     });

// Menu toggling functionality
    document.addEventListener('DOMContentLoaded', function() {
      const toggle = document.getElementById('menu-toggle');
      const nav = document.getElementById('nav-links');
      
      if (toggle && nav) {
        toggle.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent the click from bubbling
          nav.classList.toggle('show');
          console.log("Menu toggled!");
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

      // Existing functionality for gold page
      const links = document.querySelectorAll('.gold-types a');
      const sections = document.querySelectorAll('.gold-section');
      const backBtn = document.getElementById('backToTop');

      links.forEach(link=>{
        link.addEventListener('click', e=>{
          e.preventDefault();
          const id = link.dataset.target;
          document.getElementById(id).scrollIntoView({behavior:'smooth', block:'start'});
          links.forEach(l=>l.classList.remove('gold-active'));
          link.classList.add('gold-active');
        });
      });

      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            const id=entry.target.id;
            links.forEach(l=>{
              l.classList.toggle('gold-active', l.dataset.target===id);
            });
          }
        });
      },{rootMargin:"-20% 0px -70% 0px", threshold:0});

      sections.forEach(s=>observer.observe(s));

      window.addEventListener('scroll', ()=>{
        if(window.scrollY>500){ backBtn.classList.add('gold-show'); }
        else{ backBtn.classList.remove('gold-show'); }
      });
      backBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
    });

//url beautifier

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-links a");

  links.forEach(link => {
    const targetId = link.dataset.target; // only exists on homepage links

    if (targetId) {
      link.addEventListener("click", (e) => {
        // run only on homepage (path "/")
        if (window.location.pathname === "/") {
          e.preventDefault();

          const section = document.getElementById(targetId);
          if (section) {
            history.pushState({}, "", link.getAttribute("href"));
            section.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    }
  });

  // Handle refresh (e.g. /branch → load homepage & scroll)
  const mapping = {
    collection: "toproduct",
    branch: "tobranch",
    about: "toinfo",
    contact: "Information"
  };

  const path = window.location.pathname.replace("/", "");
  const sectionId = mapping[path];

  if (sectionId && document.getElementById(sectionId)) {
    document.getElementById(sectionId).scrollIntoView();
  }
});


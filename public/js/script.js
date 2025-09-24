const img1 = document.getElementById("Fade_img1");
const img2 = document.getElementById("Fade_img2");
const lines = document.querySelectorAll(".progress-line");
let current = 1;
let showingImg1 = true;
let intervalId = null;
const totalSlides = 5;

function preloadImage(src, callback) {
    const img = new Image();
    img.onload = () => callback(img.src);
    img.src = src;
}

function showSlide(index) {
    const nextImg = showingImg1 ? img2 : img1;
    const currentImg = showingImg1 ? img1 : img2;
    const newSrc = `images/${index}.jpg`;

    preloadImage(newSrc, (loadedSrc) => {
        nextImg.src = loadedSrc;
        nextImg.classList.add("active");
        currentImg.classList.remove("active");
        showingImg1 = !showingImg1;

        // Handle progress bar
        lines.forEach((line) => {
            line.querySelector(".bar")?.remove();
        });

        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.cssText = `
            position: absolute; left: 0; top: 0; height: 100%;
            background: #fffad7;
            width: 0%; transition: width 5s linear;
        `;
        lines[index - 1].appendChild(bar);
        setTimeout(() => (bar.style.width = "100%"), 50);
    });
}

function nextSlide() {
    current = (current % totalSlides) + 1;
    showSlide(current);
}

function goToSlide(index) {
    clearInterval(intervalId);
    current = index;
    showSlide(current);
    startAutoplay();
}

function startAutoplay() {
    intervalId = setInterval(() => {
        nextSlide();
    }, 5000);
}

lines.forEach((line) => {
    line.addEventListener("click", () => {
        const index = parseInt(line.dataset.index);
        goToSlide(index);
    });
});

// Initial
showSlide(current);
startAutoplay();




const toggle = document.getElementById('menu-toggle');
const nav = document.getElementById('nav-links');

toggle.addEventListener('click', () => {
  nav.classList.toggle('show');
});

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-links');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('active');
    });
  }
});




function scrollBranches(direction) {
  const container = document.getElementById("branchesContainer");
  const scrollAmount = 320; // width of item + gap
  container.scrollBy({
    left: direction * scrollAmount,
    behavior: "smooth"
  });
}




// Animate on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('animate-in');
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.about-text, .about-image').forEach(el => {
    observer.observe(el);
  });



//   window.addEventListener("scroll", () => {
//   const scrollY = window.scrollY;
//   const target = document.querySelector(".navbar");
//   const slider = document.querySelector(".slider");

//   if (window.scrollY > 0) {
//       target.classList.add("scrolled");
//       slider.classList.add("toop");
//   } else {
//       target.classList.remove("scrolled");
//       slider.classList.remove("toop");
//   }
// });


// In your script.js file
// document.addEventListener('DOMContentLoaded', function() {
//     const menuToggle = document.getElementById('menu-toggle');
//     const navLinks = document.getElementById('nav-links');
    
//     if (menuToggle && navLinks) {
//         menuToggle.addEventListener('click', function() {
//             console.log('Toggle clicked!'); // Debug line
//             navLinks.classList.toggle('active');
//         });
//     } else {
//         console.error('Could not find menu elements!');
//     }
// });

//url beautifier
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-links a");

  links.forEach(link => {
    link.addEventListener("click", (e) => {
      const targetId = link.dataset.target; // Only homepage links have this

      if (targetId) {
        e.preventDefault(); // stop full reload ONLY for section links

        const section = document.getElementById(targetId);
        if (section) {
          history.pushState({}, "", link.getAttribute("href")); // update URL
          section.scrollIntoView({ behavior: "smooth" }); // smooth scroll
        }
      }
      // If no data-target → normal navigation (e.g. /gold, /silver) works
    });
  });

  // Handle refresh (scroll to correct section if URL has /branch etc.)
  const path = window.location.pathname.replace("/", "");
  if (path) {
    const mapping = {
      collection: "toproduct",
      branch: "tobranch",
      about: "toinfo",
      contact: "Information"
    };

    const sectionId = mapping[path];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView();
    }
  }
});


document.addEventListener('DOMContentLoaded', () => {
    // Navigation logic (Tabs/Sections)
    const links = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.section');

    function activateSection(targetId, updateHistory = true) {
        // Fallback to initial section if not found
        let targetSection = document.getElementById(targetId);
        if (!targetSection) {
            targetId = 'presentacion';
            targetSection = document.getElementById(targetId);
        }

        // Hide all sections and remove active classes
        sections.forEach(section => section.classList.remove('active-section'));
        links.forEach(l => l.classList.remove('active'));

        // Show target section
        targetSection.classList.add('active-section');

        // Highlight active link
        const activeLink = document.querySelector(`.nav-links a[href="#${targetId}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Re-trigger animations manually
        const animatableElements = targetSection.querySelectorAll('.fade-in, .bounce-in');
        animatableElements.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; /* trigger reflow */
            el.style.animation = null;
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update History API parameters
        if (updateHistory) {
            const newUrl = targetId === 'presentacion'
                ? window.location.pathname // Base URL para presentación
                : `?seccion=${targetId}`;

            window.history.pushState({ section: targetId }, '', newUrl);
        }

        // Close mobile menu if active
        const mobileMenu = document.getElementById('mobile-menu');
        const navLinksContainer = document.querySelector('.nav-links');
        if (mobileMenu && navLinksContainer) {
            mobileMenu.classList.remove('is-active');
            navLinksContainer.classList.remove('mobile-active');
        }
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            activateSection(targetId, true);
        });
    });

    // Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinksContainer = document.querySelector('.nav-links');

    if (mobileMenu && navLinksContainer) {
        mobileMenu.addEventListener('click', () => {
            mobileMenu.classList.toggle('is-active');
            navLinksContainer.classList.toggle('mobile-active');
        });
    }

    // Handle browser's Forward/Back buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.section) {
            activateSection(e.state.section, false);
        } else {
            // Check URL again if state is empty
            const params = new URLSearchParams(window.location.search);
            const sectionParam = params.get('seccion');
            activateSection(sectionParam || 'presentacion', false);
        }
    });

    // Check URL query param on initial load
    const params = new URLSearchParams(window.location.search);
    const initialSection = params.get('seccion') || 'presentacion';
    activateSection(initialSection, false);

    // Add scroll effect to header
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.85)';
            header.style.boxShadow = 'none';
        }
    });

    // --- PDF.js Logic --
    const pdfUrl = 'documentos/Presentacion_Nathaly_y_Adriana.pdf';
    let pdfDoc = null,
        pageNum = 1,
        pageIsRendering = false,
        pageNumIsPending = null;

    const canvas = document.getElementById('pdf-render-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const scale = 1.5; // Escala de visualización (ajuste de calidad/tamaño)

        // Renderizar la página especificada
        const renderPage = num => {
            pageIsRendering = true;

            // Obtener página
            pdfDoc.getPage(num).then(page => {
                const viewport = page.getViewport({ scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderCtx = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                page.render(renderCtx).promise.then(() => {
                    pageIsRendering = false;

                    if (pageNumIsPending !== null) {
                        renderPage(pageNumIsPending);
                        pageNumIsPending = null;
                    }
                });

                // Actualizar números en la interfaz
                document.getElementById('page-num').textContent = num;

                // Habilitar/Deshabilitar botones
                document.getElementById('prev-page').disabled = num <= 1;
                document.getElementById('next-page').disabled = num >= pdfDoc.numPages;
            });
        };

        // Comprobar si hay páginas pendientes por renderizar
        const queueRenderPage = num => {
            if (pageIsRendering) {
                pageNumIsPending = num;
            } else {
                renderPage(num);
            }
        };

        // Página Anterior
        const showPrevPage = () => {
            if (pageNum <= 1) return;
            pageNum--;
            queueRenderPage(pageNum);
        };

        // Página Siguiente
        const showNextPage = () => {
            if (pageNum >= pdfDoc.numPages) return;
            pageNum++;
            queueRenderPage(pageNum);
        };

        // Asignar eventos de click
        document.getElementById('prev-page').addEventListener('click', showPrevPage);
        document.getElementById('next-page').addEventListener('click', showNextPage);

        // Cargar el documento inicial (esperando que pdf.js global exista)
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

            pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc_ => {
                pdfDoc = pdfDoc_;
                document.getElementById('page-count').textContent = pdfDoc.numPages;
                renderPage(pageNum);
            }).catch(err => {
                // Si el archivo no existe o hay error de CORS:
                console.error("Error al cargar PDF: ", err);
                const container = document.querySelector('.pdf-viewer-container');
                container.innerHTML = '<p style="color: #b91c1c; font-weight: 600;">Error: No se pudo cargar el archivo "documentos/Presentación Nathaly y Adriana.pdf". Verifica que el archivo exista en la ruta correcta.</p>';
            });
        }
    }
});

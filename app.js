/* ==========================================================================
   AdLink Hub - Banner Asset Manager
   Main Frontend Application Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let projectsList = [];
  let pendingFiles = []; // [{ file: File, path: string, size: number }]
  let currentPreviewUrl = '';

  // DOM Elements - Main Layout & Controls
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const dbStatusPill = document.getElementById('db-status-pill');
  const dbStatusText = document.getElementById('db-status-text');

  // Stats Elements
  const statTotalProjects = document.getElementById('stat-total-projects');
  const statActiveLinks = document.getElementById('stat-active-links');
  const statTotalFiles = document.getElementById('stat-total-files');
  const statTotalStorage = document.getElementById('stat-total-storage');

  // Upload Section Elements
  const dropzone = document.getElementById('dropzone');
  const folderInput = document.getElementById('folder-input');
  const zipInput = document.getElementById('zip-input');
  const btnQuickUpload = document.getElementById('btn-quick-upload');

  // Upload Form Modal Elements
  const uploadModalOverlay = document.getElementById('upload-modal-overlay');
  const uploadModalFolderName = document.getElementById('upload-modal-folder-name');
  const btnCloseUploadModal = document.getElementById('btn-close-upload-modal');
  const projectNameInput = document.getElementById('project-name-input');
  const entryFileSelect = document.getElementById('entry-file-select');
  const selectedFileCount = document.getElementById('selected-file-count');
  const selectedTotalSize = document.getElementById('selected-total-size');
  const selectedFilesList = document.getElementById('selected-files-list');
  const uploadProgressContainer = document.getElementById('upload-progress-container');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const btnStartUpload = document.getElementById('btn-start-upload');
  const btnCancelUpload = document.getElementById('btn-cancel-upload');

  // Upload Success Modal Elements
  const uploadSuccessModal = document.getElementById('upload-success-modal');
  const successModalLinkUrl = document.getElementById('success-modal-link-url');
  const btnSuccessCopyLink = document.getElementById('btn-success-copy-link');
  const btnSuccessClose = document.getElementById('btn-success-close');
  const btnSuccessPreview = document.getElementById('btn-success-preview');

  // Filter & Search Elements
  const searchInput = document.getElementById('search-input');
  const dateFilter = document.getElementById('date-filter');
  const btnClearDate = document.getElementById('btn-clear-date');
  const sortSelect = document.getElementById('sort-select');
  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewListBtn = document.getElementById('view-list-btn');

  // Projects Grid Elements
  const projectsGrid = document.getElementById('projects-grid');
  const emptyState = document.getElementById('empty-state');

  // Preview Modal Elements
  const previewModal = document.getElementById('preview-modal');
  const previewModalTitle = document.getElementById('preview-modal-title');
  const previewModalUrl = document.getElementById('preview-modal-url');
  const bannerPreviewIframe = document.getElementById('banner-preview-iframe');
  const iframeContainer = document.getElementById('iframe-container');
  const btnCopyPreviewLink = document.getElementById('btn-copy-preview-link');
  const btnOpenPreviewTab = document.getElementById('btn-open-preview-tab');
  const btnClosePreview = document.getElementById('btn-close-preview');

  // Firebase Config Modal Elements
  const firebaseModal = document.getElementById('firebase-modal');
  const btnOpenFirebaseConfig = document.getElementById('btn-open-firebase-config');
  const btnConfigureDb = document.getElementById('btn-configure-db');
  const btnCloseFirebase = document.getElementById('btn-close-firebase');
  const firebaseConfigForm = document.getElementById('firebase-config-form');
  const btnClearFirebase = document.getElementById('btn-clear-firebase');

  let currentViewMode = 'grid'; // 'grid' or 'list'
  const LOCAL_STORAGE_PROJECTS_KEY = 'adlink_hub_projects';

  /* ==========================================================================
     Off-Canvas Sidebar Drawer Controls
     ========================================================================== */

  function openSidebarDrawer() {
    if (sidebar && sidebarBackdrop) {
      sidebar.classList.add('open');
      sidebarBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSidebarDrawer() {
    if (sidebar && sidebarBackdrop) {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (btnMobileMenu) btnMobileMenu.addEventListener('click', openSidebarDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeSidebarDrawer);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebarDrawer);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', closeSidebarDrawer);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebarDrawer();
      if (previewModal && previewModal.style.display === 'flex') previewModal.style.display = 'none';
      if (firebaseModal && firebaseModal.style.display === 'flex') firebaseModal.style.display = 'none';
      if (uploadModalOverlay && uploadModalOverlay.style.display === 'flex') resetUploadForm();
    }
  });

  /* ==========================================================================
     Initialize Application State
     ========================================================================== */

  updateDatabaseStatusIndicator();
  loadProjects();

  function updateDatabaseStatusIndicator() {
    const isFirebaseActive = window.firebaseManager && window.firebaseManager.isFirebaseActive;
    if (isFirebaseActive) {
      dbStatusPill.querySelector('.dot').className = 'dot green';
      dbStatusText.textContent = `Cloud Firestore Connected (${window.firebaseManager.config.projectId})`;
    } else {
      dbStatusPill.querySelector('.dot').className = 'dot yellow';
      dbStatusText.textContent = 'Local Server Hosting Mode';
    }
  }

  /* ==========================================================================
     Load Projects (Firestore DB with Local Storage Fallback)
     ========================================================================== */

  async function loadProjects() {
    const isFirebaseActive = window.firebaseManager && window.firebaseManager.isFirebaseActive;

    if (isFirebaseActive) {
      try {
        const snapshot = await window.firebaseManager.db.collection('banner_projects').orderBy('createdAt', 'desc').get();
        projectsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProjects();
        updateStats();
        return;
      } catch (err) {
        console.warn('Firestore load failed, falling back to local server storage:', err);
      }
    }

    projectsList = getLocalProjects();
    renderProjects();
    updateStats();
  }

  /* ==========================================================================
     Filter, Sort & View Modes
     ========================================================================== */

  if (dateFilter) {
    dateFilter.addEventListener('change', () => {
      if (btnClearDate) btnClearDate.style.display = dateFilter.value ? 'block' : 'none';
      renderProjects();
    });
  }

  if (btnClearDate) {
    btnClearDate.addEventListener('click', () => {
      dateFilter.value = '';
      btnClearDate.style.display = 'none';
      renderProjects();
    });
  }

  if (sortSelect) sortSelect.addEventListener('change', renderProjects);
  if (searchInput) searchInput.addEventListener('input', renderProjects);

  if (viewGridBtn) {
    viewGridBtn.addEventListener('click', () => {
      currentViewMode = 'grid';
      viewGridBtn.classList.add('active');
      if (viewListBtn) viewListBtn.classList.remove('active');
      if (projectsGrid) projectsGrid.classList.remove('list-view');
      renderProjects();
    });
  }

  if (viewListBtn) {
    viewListBtn.addEventListener('click', () => {
      currentViewMode = 'list';
      viewListBtn.classList.add('active');
      if (viewGridBtn) viewGridBtn.classList.remove('active');
      if (projectsGrid) projectsGrid.classList.add('list-view');
      renderProjects();
    });
  }

  /* ==========================================================================
     Render Projects Grid / List
     ========================================================================== */

  function renderProjects() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedDate = dateFilter ? dateFilter.value : '';
    const sortMode = sortSelect ? sortSelect.value : 'newest';

    let filtered = projectsList.filter(p => {
      const nameMatches = (p.projectName || '').toLowerCase().includes(searchTerm);
      let dateMatches = true;
      if (selectedDate && p.createdAt) {
        const projDateStr = new Date(p.createdAt).toISOString().split('T')[0];
        dateMatches = projDateStr === selectedDate;
      }
      return nameMatches && dateMatches;
    });

    // Sorting Logic
    filtered.sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortMode === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortMode === 'name-asc') return (a.projectName || '').localeCompare(b.projectName || '');
      if (sortMode === 'name-desc') return (b.projectName || '').localeCompare(a.projectName || '');
      return 0;
    });

    if (filtered.length === 0) {
      if (projectsGrid) projectsGrid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (projectsGrid) {
      projectsGrid.innerHTML = '';
      if (currentViewMode === 'list') {
        projectsGrid.classList.add('list-view');
      } else {
        projectsGrid.classList.remove('list-view');
      }
    }

    filtered.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'project-card';

      const createdDateStr = new Date(proj.createdAt || Date.now()).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const isList = currentViewMode === 'list';

      const actionsHtml = isList ? `
        <div class="card-action-btns">
          <button class="btn-icon-circle btn-preview-ad" data-id="${proj.id}" title="Preview Ad" aria-label="Preview Ad">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-icon-circle btn-edit-project" data-id="${proj.id}" data-name="${escapeHtml(proj.projectName)}" title="Rename Project" aria-label="Rename Project">
            <i class="fa-solid fa-pen"></i>
          </button>
          <a href="${proj.mainHtmlUrl}" target="_blank" class="btn-icon-circle" title="Open Link in New Tab" aria-label="Open link in new tab">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
          <button class="btn-icon-circle btn-danger btn-delete-project" data-id="${proj.id}" data-name="${escapeHtml(proj.projectName)}" title="Delete Project" aria-label="Delete Project">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      ` : `
        <button class="btn-secondary btn-sm btn-preview-ad" data-id="${proj.id}" aria-label="Preview Ad">
          <i class="fa-solid fa-eye"></i> <span class="btn-text">Preview Ad</span>
        </button>
        
        <div class="card-action-btns">
          <button class="btn-secondary btn-sm btn-edit-project" data-id="${proj.id}" data-name="${escapeHtml(proj.projectName)}" title="Rename Project" aria-label="Rename Project">
            <i class="fa-solid fa-pen"></i>
          </button>
          <a href="${proj.mainHtmlUrl}" target="_blank" class="btn-secondary btn-sm" title="Open Link in New Tab" aria-label="Open link in new tab">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
          <button class="btn-secondary btn-sm btn-danger btn-delete-project" data-id="${proj.id}" data-name="${escapeHtml(proj.projectName)}" title="Delete Project" aria-label="Delete Project">
            <i class="fa-solid fa-trash-can"></i> <span class="btn-text">Delete</span>
          </button>
        </div>
      `;

      card.innerHTML = `
        <div>
          <div class="card-header">
            <div class="card-title-group">
              <h3>${escapeHtml(proj.projectName)}</h3>
              <span><i class="fa-regular fa-clock"></i> ${createdDateStr}</span>
            </div>
            <span class="badge">${proj.storageType === 'firebase' ? 'Firebase' : 'Live Hosted'}</span>
          </div>

          <div class="link-box">
            <a href="${proj.mainHtmlUrl}" target="_blank" class="link-url" title="${proj.mainHtmlUrl}">
              ${proj.mainHtmlUrl}
            </a>
            <button class="btn-secondary btn-sm btn-copy-link" data-url="${proj.mainHtmlUrl}" title="Copy Link" aria-label="Copy banner URL link">
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>

          <div class="card-meta-details">
            <span title="Files Count"><i class="fa-solid fa-file-code"></i> ${proj.fileCount || 1}</span>
            <span title="Total Size"><i class="fa-solid fa-hard-drive"></i> ${formatBytes(proj.totalSize || 0)}</span>
            <span title="Entry File"><i class="fa-solid fa-code-branch"></i> ${escapeHtml(proj.entryFilePath || 'index.html')}</span>
          </div>
        </div>

        <div class="card-actions">
          ${actionsHtml}
        </div>
      `;

      projectsGrid.appendChild(card);
    });

    // Wire Card Event Handlers
    document.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = btn.dataset.url;
        navigator.clipboard.writeText(url);
        showToast('Live URL copied to clipboard!', 'success');
      });
    });

    document.querySelectorAll('.btn-preview-ad').forEach(btn => {
      btn.addEventListener('click', () => {
        const projId = btn.dataset.id;
        const proj = projectsList.find(p => p.id === projId);
        if (proj) openPreviewModal(proj);
      });
    });

    document.querySelectorAll('.btn-delete-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const projId = btn.dataset.id;
        const projName = btn.dataset.name;
        deleteProjectWorkflow(projId, projName);
      });
    });

    document.querySelectorAll('.btn-edit-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const projId = btn.dataset.id;
        const currentName = btn.dataset.name;
        renameProjectWorkflow(projId, currentName);
      });
    });
  }

  /* ==========================================================================
     Folder & ZIP Upload File Handlers
     ========================================================================== */

  if (btnQuickUpload) {
    btnQuickUpload.addEventListener('click', () => {
      const uploadSection = document.getElementById('upload-section');
      if (uploadSection) uploadSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Folder Selector Handler
  if (folderInput) {
    folderInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      let folderName = 'Banner_Project';
      if (files[0].webkitRelativePath) {
        folderName = files[0].webkitRelativePath.split('/')[0];
      }

      pendingFiles = files.map(f => ({
        file: f,
        path: f.webkitRelativePath ? f.webkitRelativePath.substring(f.webkitRelativePath.indexOf('/') + 1) : f.name,
        size: f.size
      })).filter(f => f.path && !f.path.startsWith('.'));

      populateUploadMeta(folderName);
    });
  }

  // ZIP Selector Handler
  if (zipInput) {
    zipInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const zipName = file.name.replace(/\.zip$/i, '');
      showToast('Extracting ZIP archive...', 'info');

      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file);
        pendingFiles = [];

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir && !relativePath.startsWith('__MACOSX') && !relativePath.startsWith('.')) {
            const blob = await zipEntry.async('blob');
            const cleanPath = relativePath.includes('/') ? relativePath.substring(relativePath.indexOf('/') + 1) : relativePath;

            pendingFiles.push({
              file: new File([blob], zipEntry.name.split('/').pop(), { type: blob.type }),
              path: cleanPath || relativePath,
              size: blob.size
            });
          }
        }

        populateUploadMeta(zipName);
      } catch (err) {
        console.error('ZIP read error:', err);
        showToast('Failed to parse ZIP archive: ' + err.message, 'error');
      }
    });
  }

  // Drag & Drop Handlers
  if (dropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', async (e) => {
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const entry = items[0].webkitGetAsEntry();
        if (entry) {
          showToast('Reading dropped files...', 'info');
          pendingFiles = [];
          await readEntryRecursive(entry, '');
          const defaultName = entry.name || 'Uploaded_Banner';
          populateUploadMeta(defaultName);
        }
      }
    });
  }

  async function readEntryRecursive(entry, currentPath = '') {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          pendingFiles.push({
            file: file,
            path: currentPath ? `${currentPath}/${file.name}` : file.name,
            size: file.size
          });
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readAllEntries = async () => {
        let entries = [];
        const readBatch = () => new Promise((resolve) => {
          dirReader.readEntries((results) => {
            if (!results || !results.length) {
              resolve([]);
            } else {
              entries = entries.concat(Array.from(results));
              dirReader.readEntries(resolve);
            }
          });
        });
        await readBatch();
        return entries;
      };

      const entries = await readAllEntries();
      for (const childEntry of entries) {
        const nextPath = currentPath ? `${currentPath}/${childEntry.name}` : (entry.name === childEntry.name ? '' : childEntry.name);
        await readEntryRecursive(childEntry, nextPath);
      }
    }
  }

  /* ==========================================================================
     Populate & Process Upload Meta Form Modal
     ========================================================================== */

  function populateUploadMeta(defaultProjectName) {
    if (pendingFiles.length === 0) {
      showToast('No valid banner files found in selection.', 'error');
      return;
    }

    if (uploadModalFolderName) uploadModalFolderName.textContent = `Folder/Package: "${defaultProjectName}" (${pendingFiles.length} files)`;
    if (projectNameInput) projectNameInput.value = defaultProjectName || 'Banner_Ad_Project';
    if (entryFileSelect) entryFileSelect.innerHTML = '';

    let defaultEntryIndex = -1;
    let totalBytes = 0;

    if (selectedFilesList) selectedFilesList.innerHTML = '';

    pendingFiles.forEach((f, idx) => {
      totalBytes += f.size;
      const fileName = (f.path ? f.path.split('/').pop() : (f.file ? f.file.name : '')).toLowerCase();

      if (fileName.endsWith('.html')) {
        const option = document.createElement('option');
        option.value = f.path;
        option.textContent = f.path;

        if (defaultEntryIndex === -1 || fileName === 'index.html' || fileName.includes('ad')) {
          defaultEntryIndex = entryFileSelect.options.length;
        }
        entryFileSelect.appendChild(option);
      }

      if (selectedFilesList && idx < 10) {
        const li = document.createElement('li');
        li.innerHTML = `<span><i class="fa-regular fa-file"></i> ${f.path}</span> <span>${formatBytes(f.size)}</span>`;
        selectedFilesList.appendChild(li);
      }
    });

    if (selectedFilesList && pendingFiles.length > 10) {
      const li = document.createElement('li');
      li.style.fontStyle = 'italic';
      li.style.color = 'var(--text-subtle)';
      li.textContent = `... and ${pendingFiles.length - 10} more files.`;
      selectedFilesList.appendChild(li);
    }

    if (entryFileSelect) {
      if (entryFileSelect.options.length === 0) {
        const option = document.createElement('option');
        option.value = pendingFiles[0].path;
        option.textContent = pendingFiles[0].path + ' (No .html file found)';
        entryFileSelect.appendChild(option);
      } else if (defaultEntryIndex >= 0) {
        entryFileSelect.selectedIndex = defaultEntryIndex;
      }
    }

    if (selectedFileCount) selectedFileCount.textContent = pendingFiles.length;
    if (selectedTotalSize) selectedTotalSize.textContent = formatBytes(totalBytes);

    if (uploadModalOverlay) uploadModalOverlay.style.display = 'flex';
  }

  function resetUploadForm() {
    pendingFiles = [];
    if (uploadModalOverlay) uploadModalOverlay.style.display = 'none';
    if (uploadProgressContainer) uploadProgressContainer.style.display = 'none';
    if (folderInput) folderInput.value = '';
    if (zipInput) zipInput.value = '';
  }

  if (btnCloseUploadModal) btnCloseUploadModal.addEventListener('click', resetUploadForm);
  if (btnCancelUpload) btnCancelUpload.addEventListener('click', resetUploadForm);

  /* ==========================================================================
     Start Upload Execution (Firebase Cloud, Local Server, or Web Blob)
     ========================================================================== */

  if (btnStartUpload) {
    btnStartUpload.addEventListener('click', async () => {
      const rawProjectName = projectNameInput.value.trim() || 'Banner_Project';
      const entryFilePath = entryFileSelect.value || (pendingFiles[0] ? pendingFiles[0].path : 'index.html');
      const projectSlug = rawProjectName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      const projectId = `${projectSlug}_${Date.now().toString().slice(-4)}`;

      uploadProgressContainer.style.display = 'block';
      btnStartUpload.disabled = true;

      const isFirebaseActive = window.firebaseManager && window.firebaseManager.isFirebaseActive;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (isFirebaseActive) {
        try {
          const firebaseUploadPromise = uploadToFirebase(projectId, rawProjectName, entryFilePath);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firebase Storage unresponsive (CORS or Security Rules blocking access)')), 5000)
          );

          const result = await Promise.race([firebaseUploadPromise, timeoutPromise]);
          showUploadSuccessModal(result.mainHtmlUrl, result.projectName);
          return;
        } catch (err) {
          console.warn('Firebase Storage upload bypass:', err.message);
          showToast('Firebase connection delayed. Processing instant web deployment...', 'info');
        }
      }

      // Fallback: Local Server (on localhost) or Instant Web Blob (on Netlify/Vercel)
      if (isLocalhost) {
        uploadToLocalServer(projectId, rawProjectName, entryFilePath);
      } else {
        processCloudBlobUpload(projectId, rawProjectName, entryFilePath);
      }
    });
  }

  async function processCloudBlobUpload(projectId, projectName, entryFilePath) {
    updateProgress(25, 'Preparing assets for instant cloud deployment...');
    let totalBytes = 0;
    pendingFiles.forEach(f => totalBytes += f.size);

    try {
      updateProgress(60, 'Generating live web banner link...');
      const mainHtmlUrl = await createBlobBannerUrl(pendingFiles, entryFilePath);

      const projectData = {
        id: projectId,
        projectName: projectName,
        entryFilePath: entryFilePath,
        mainHtmlUrl: mainHtmlUrl,
        totalSize: totalBytes,
        fileCount: pendingFiles.length,
        createdAt: new Date().toISOString(),
        storageType: 'blob'
      };

      saveLocalProject(projectData);
      if (window.firebaseManager && window.firebaseManager.isFirebaseActive) {
        try {
          await window.firebaseManager.db.collection('banner_projects').doc(projectId).set(projectData);
        } catch (e) {
          console.warn('Firestore metadata sync note:', e);
        }
      }

      updateProgress(100, 'Upload Complete!');
      showUploadSuccessModal(mainHtmlUrl, projectName);

    } catch (err) {
      console.error('Instant cloud deployment error:', err);
      showToast('Error processing banner: ' + err.message, 'error');
      btnStartUpload.disabled = false;
    }
  }

  async function createBlobBannerUrl(pendingFiles, entryFilePath) {
    const fileMap = new Map();
    let entryFile = null;

    for (const f of pendingFiles) {
      if (f.path === entryFilePath || (f.file && f.file.name === entryFilePath)) {
        entryFile = f;
      }
      const dataUrl = await fileToDataUrl(f.file);
      fileMap.set(f.path, dataUrl);
      const baseName = f.path.split('/').pop();
      if (!fileMap.has(baseName)) fileMap.set(baseName, dataUrl);
    }

    if (!entryFile) entryFile = pendingFiles.find(f => f.path.endsWith('.html')) || pendingFiles[0];

    let htmlText = await fileToText(entryFile.file);

    // Replace relative asset references with Data URLs
    fileMap.forEach((dataUrl, relPath) => {
      if (relPath !== entryFilePath) {
        const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(["'])${escapedPath}(["'])`, 'g');
        htmlText = htmlText.replace(regex, `$1${dataUrl}$2`);

        const baseName = relPath.split('/').pop();
        const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexBase = new RegExp(`(["'])${escapedBase}(["'])`, 'g');
        htmlText = htmlText.replace(regexBase, `$1${dataUrl}$2`);
      }
    });

    const blob = new Blob([htmlText], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
    });
  }

  function fileToText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
    });
  }

  async function uploadToLocalServer(projectId, projectName, entryFilePath) {
    updateProgress(10, 'Preparing assets for local server...');

    try {
      let totalBytes = 0;
      pendingFiles.forEach(f => totalBytes += f.size);

      const encodedFiles = [];
      for (let i = 0; i < pendingFiles.length; i++) {
        const f = pendingFiles[i];
        const content = await fileToBase64(f.file);
        encodedFiles.push({
          path: f.path,
          content: content,
          isBase64: true
        });
        const pct = Math.round(10 + ((i + 1) / pendingFiles.length) * 50);
        updateProgress(pct, `Processing file ${i + 1} of ${pendingFiles.length}...`);
      }

      updateProgress(70, 'Saving assets to local disk...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          projectName: projectName,
          files: encodedFiles
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Server upload failed');

      const mainHtmlUrl = `${data.baseUrl}${entryFilePath}`;

      const projectData = {
        id: projectId,
        projectName: projectName,
        entryFilePath: entryFilePath,
        mainHtmlUrl: mainHtmlUrl,
        totalSize: totalBytes,
        fileCount: pendingFiles.length,
        createdAt: new Date().toISOString(),
        storageType: 'local'
      };

      // Save metadata locally and sync with Firestore DB if configured
      saveLocalProject(projectData);
      if (window.firebaseManager && window.firebaseManager.isFirebaseActive) {
        try {
          await window.firebaseManager.db.collection('banner_projects').doc(projectId).set(projectData);
        } catch (e) {
          console.warn('Firestore DB metadata sync warning:', e);
        }
      }

      updateProgress(100, 'Upload Complete!');
      showUploadSuccessModal(mainHtmlUrl, projectName);

    } catch (err) {
      console.error('Local server upload error:', err);
      showToast('Error saving banner project: ' + err.message, 'error');
      btnStartUpload.disabled = false;
    }
  }

  async function uploadToFirebase(projectId, projectName, entryFilePath) {
    const storage = window.firebaseManager.storage;
    const db = window.firebaseManager.db;
    const totalFiles = pendingFiles.length;
    let grandTotalBytes = 0;
    pendingFiles.forEach(f => grandTotalBytes += f.size);

    const fileTransferred = new Map();
    const uploadedAssetPaths = [];

    const updateGrandProgress = () => {
      let currentTransferred = 0;
      fileTransferred.forEach(bytes => currentTransferred += bytes);
      const pct = Math.min(95, Math.max(5, Math.round((currentTransferred / (grandTotalBytes || 1)) * 90)));
      const mbTransferred = (currentTransferred / (1024 * 1024)).toFixed(2);
      const mbTotal = (grandTotalBytes / (1024 * 1024)).toFixed(2);
      updateProgress(pct, `Uploading to Firebase (${mbTransferred} MB / ${mbTotal} MB)...`);
    };

    updateProgress(5, `Starting upload of ${totalFiles} files (${(grandTotalBytes / (1024 * 1024)).toFixed(2)} MB)...`);

    const uploadPromises = pendingFiles.map((fileObj) => {
      return new Promise((resolve, reject) => {
        const storagePath = `banners/${projectId}/${fileObj.path}`;
        const storageRef = storage.ref(storagePath);
        const uploadTask = storageRef.put(fileObj.file);

        fileTransferred.set(fileObj.path, 0);

        uploadTask.on('state_changed', 
          (snapshot) => {
            fileTransferred.set(fileObj.path, snapshot.bytesTransferred);
            updateGrandProgress();
          },
          (error) => {
            reject(error);
          },
          () => {
            fileTransferred.set(fileObj.path, fileObj.size);
            updateGrandProgress();
            uploadedAssetPaths.push(storagePath);
            resolve({ size: fileObj.size, path: storagePath });
          }
        );
      });
    });

    await Promise.all(uploadPromises);

    updateProgress(95, 'Generating live banner URL...');
    const entryStoragePath = `banners/${projectId}/${entryFilePath}`;
    const mainHtmlUrl = await storage.ref(entryStoragePath).getDownloadURL();

    const projectData = {
      id: projectId,
      projectName: projectName,
      entryFilePath: entryFilePath,
      mainHtmlUrl: mainHtmlUrl,
      totalSize: grandTotalBytes,
      fileCount: totalFiles,
      assetPaths: uploadedAssetPaths,
      createdAt: new Date().toISOString(),
      storageType: 'firebase'
    };

    await db.collection('banner_projects').doc(projectId).set(projectData);
    updateProgress(100, 'Upload Complete!');
    return projectData;
  }

  function updateProgress(percent, statusText) {
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressStatusText) progressStatusText.textContent = statusText;
  }

  function showUploadSuccessModal(mainHtmlUrl, projectName) {
    resetUploadForm();
    btnStartUpload.disabled = false;

    if (successModalLinkUrl) {
      successModalLinkUrl.href = mainHtmlUrl;
      successModalLinkUrl.textContent = mainHtmlUrl;
    }

    if (uploadSuccessModal) uploadSuccessModal.style.display = 'flex';

    if (btnSuccessCopyLink) {
      btnSuccessCopyLink.onclick = () => {
        navigator.clipboard.writeText(mainHtmlUrl);
        showToast('Live banner URL copied to clipboard!', 'success');
      };
    }

    if (btnSuccessClose) {
      btnSuccessClose.onclick = () => {
        uploadSuccessModal.style.display = 'none';
        loadProjects();
      };
    }

    if (btnSuccessPreview) {
      btnSuccessPreview.onclick = () => {
        uploadSuccessModal.style.display = 'none';
        const project = projectsList.find(p => p.mainHtmlUrl === mainHtmlUrl) || { projectName, mainHtmlUrl };
        openPreviewModal(project);
        loadProjects();
      };
    }

    loadProjects();
  }

  /* ==========================================================================
     Custom Glassmorphism Confirm & Prompt Modals
     ========================================================================== */

  function showCustomConfirm({ title = 'Delete Banner Project?', message, iconClass = 'fa-triangle-exclamation', confirmText = 'Delete', isDanger = true }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const iconEl = document.getElementById('confirm-modal-icon');
      const inputGroup = document.getElementById('confirm-modal-input-group');
      const actionBtn = document.getElementById('confirm-modal-action-btn');
      const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (iconEl) iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
      if (inputGroup) inputGroup.style.display = 'none';

      if (actionBtn) {
        actionBtn.textContent = confirmText;
        actionBtn.className = isDanger ? 'btn-primary btn-danger' : 'btn-primary';
      }

      if (modal) modal.style.display = 'flex';

      const cleanup = () => {
        if (modal) modal.style.display = 'none';
        if (actionBtn) actionBtn.removeEventListener('click', onConfirm);
        if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      };

      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      if (actionBtn) actionBtn.addEventListener('click', onConfirm);
      if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    });
  }

  function showCustomPrompt({ title = 'Rename Project', message = 'Enter a new name for this banner project:', defaultValue = '', iconClass = 'fa-pen' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const iconEl = document.getElementById('confirm-modal-icon');
      const inputGroup = document.getElementById('confirm-modal-input-group');
      const inputEl = document.getElementById('confirm-modal-input');
      const actionBtn = document.getElementById('confirm-modal-action-btn');
      const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (iconEl) iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
      if (inputGroup) inputGroup.style.display = 'block';
      if (inputEl) inputEl.value = defaultValue;

      if (actionBtn) {
        actionBtn.textContent = 'Save Changes';
        actionBtn.className = 'btn-primary';
      }

      if (modal) modal.style.display = 'flex';
      if (inputEl) setTimeout(() => inputEl.focus(), 100);

      const cleanup = () => {
        if (modal) modal.style.display = 'none';
        if (actionBtn) actionBtn.removeEventListener('click', onConfirm);
        if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      };

      const onConfirm = () => {
        const val = inputEl ? inputEl.value : '';
        cleanup();
        resolve(val);
      };
      const onCancel = () => { cleanup(); resolve(null); };

      if (actionBtn) actionBtn.addEventListener('click', onConfirm);
      if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    });
  }

  async function renameProjectWorkflow(projectId, currentName) {
    const newName = await showCustomPrompt({
      title: 'Rename Banner Project',
      message: 'Enter a new name for this banner project:',
      defaultValue: currentName,
      iconClass: 'fa-pen-to-square'
    });

    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    const trimmedName = newName.trim();
    showToast(`Updating project name to "${trimmedName}"...`, 'info');
    const isFirebase = window.firebaseManager && window.firebaseManager.isFirebaseActive;

    try {
      if (isFirebase) {
        await window.firebaseManager.db.collection('banner_projects').doc(projectId).update({
          projectName: trimmedName
        });
      } else {
        updateLocalProjectName(projectId, trimmedName);
      }

      showToast(`Project renamed to "${trimmedName}"!`, 'success');
      loadProjects();
    } catch (err) {
      console.error('Rename error:', err);
      showToast('Error renaming project: ' + err.message, 'error');
    }
  }

  async function deleteProjectWorkflow(projectId, projectName) {
    const confirmed = await showCustomConfirm({
      title: 'Delete Banner Project?',
      message: `Are you sure you want to delete "${projectName}"? This will permanently remove all files from storage and delete the live link.`,
      iconClass: 'fa-trash-can',
      confirmText: 'Delete Project',
      isDanger: true
    });

    if (!confirmed) return;

    showToast(`Deleting project "${projectName}"...`, 'info');
    const isFirebase = window.firebaseManager && window.firebaseManager.isFirebaseActive;

    try {
      removeLocalProject(projectId);

      try {
        await fetch(`/api/project/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
      } catch (serverErr) {
        console.warn('Backend server deletion warning:', serverErr);
      }

      if (isFirebase) {
        try {
          await window.firebaseManager.db.collection('banner_projects').doc(projectId).delete();
        } catch (dbErr) {
          console.warn('Firestore document deletion error:', dbErr);
        }

        try {
          const project = projectsList.find(p => p.id === projectId);
          const storage = window.firebaseManager.storage;
          if (project && project.assetPaths && Array.isArray(project.assetPaths)) {
            for (const assetPath of project.assetPaths) {
              if (assetPath.startsWith('banners/')) {
                await storage.ref(assetPath).delete().catch(() => {});
              }
            }
          }
        } catch (storageErr) {
          console.warn('Firebase Storage asset cleanup warning:', storageErr);
        }
      }

      showToast(`Banner project "${projectName}" deleted successfully.`, 'success');
      loadProjects();

    } catch (err) {
      console.error('Delete workflow error:', err);
      showToast('Error deleting project: ' + err.message, 'error');
      loadProjects();
    }
  }

  /* ==========================================================================
     Banner Preview Modal Controls
     ========================================================================== */

  function openPreviewModal(project) {
    if (previewModalTitle) previewModalTitle.textContent = project.projectName;
    if (previewModalUrl) previewModalUrl.textContent = project.mainHtmlUrl;
    currentPreviewUrl = project.mainHtmlUrl;

    if (bannerPreviewIframe) bannerPreviewIframe.src = project.mainHtmlUrl;
    if (btnOpenPreviewTab) btnOpenPreviewTab.href = project.mainHtmlUrl;

    if (previewModal) previewModal.style.display = 'flex';
  }

  if (btnClosePreview) btnClosePreview.addEventListener('click', () => previewModal.style.display = 'none');

  if (btnCopyPreviewLink) {
    btnCopyPreviewLink.addEventListener('click', () => {
      if (currentPreviewUrl) {
        navigator.clipboard.writeText(currentPreviewUrl);
        showToast('Preview link copied to clipboard!', 'success');
      }
    });
  }

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const w = btn.dataset.w;
      const h = btn.dataset.h;

      if (iframeContainer) {
        iframeContainer.style.width = w.endsWith('%') ? w : `${w}px`;
        iframeContainer.style.height = h.endsWith('%') ? h : `${h}px`;
      }
    });
  });

  /* ==========================================================================
     Firebase Configuration Modal Handlers
     ========================================================================== */

  const openFirebaseModal = () => {
    populateFirebaseForm();
    if (firebaseModal) firebaseModal.style.display = 'flex';
  };

  if (btnOpenFirebaseConfig) btnOpenFirebaseConfig.addEventListener('click', openFirebaseModal);
  if (btnConfigureDb) btnConfigureDb.addEventListener('click', openFirebaseModal);
  if (btnCloseFirebase) btnCloseFirebase.addEventListener('click', () => firebaseModal.style.display = 'none');

  if (firebaseConfigForm) {
    firebaseConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const config = {
        apiKey: document.getElementById('fb-apiKey').value.trim(),
        authDomain: document.getElementById('fb-authDomain').value.trim(),
        projectId: document.getElementById('fb-projectId').value.trim(),
        storageBucket: document.getElementById('fb-storageBucket').value.trim(),
        appId: document.getElementById('fb-appId').value.trim()
      };

      const success = window.firebaseManager.saveConfig(config);
      if (success) {
        showToast('Connected to Firebase project successfully!', 'success');
        firebaseModal.style.display = 'none';
        updateDatabaseStatusIndicator();
        loadProjects();
      } else {
        showToast('Failed to connect to Firebase. Check API credentials.', 'error');
      }
    });
  }

  if (btnClearFirebase) {
    btnClearFirebase.addEventListener('click', () => {
      window.firebaseManager.clearConfig();
      showToast('Switched to Local Hosting Mode.', 'info');
      firebaseModal.style.display = 'none';
      updateDatabaseStatusIndicator();
      loadProjects();
    });
  }

  /* ==========================================================================
     Stats & Helper Utilities
     ========================================================================== */

  function updateStats() {
    const totalProjects = projectsList.length;
    let totalFiles = 0;
    let totalStorageBytes = 0;

    projectsList.forEach(p => {
      totalFiles += p.fileCount || 1;
      totalStorageBytes += p.totalSize || 0;
    });

    if (statTotalProjects) statTotalProjects.textContent = totalProjects;
    if (statActiveLinks) statActiveLinks.textContent = totalProjects;
    if (statTotalFiles) statTotalFiles.textContent = totalFiles;
    if (statTotalStorage) statTotalStorage.textContent = formatBytes(totalStorageBytes);
  }

  const LOCAL_STORAGE_INIT_KEY = 'adlink_hub_initialized';

  function getLocalProjects() {
    try {
      const isInitialized = localStorage.getItem(LOCAL_STORAGE_INIT_KEY);
      const saved = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      let list = saved ? JSON.parse(saved) : [];

      if (!isInitialized) {
        list = [{
          id: 'untitled_folder_2',
          projectName: 'untitled folder 2',
          entryFilePath: 'ACI_Ad.html',
          mainHtmlUrl: 'http://localhost:3000/uploads/untitled_folder_2/ACI_Ad.html',
          totalSize: 17652712,
          fileCount: 4,
          assetPaths: ['ACI_Ad.html', 'ACI_Ad.js', 'images/ACI_Ad_atlas_1.png', 'images/0719(6).gif'],
          createdAt: new Date().toISOString(),
          storageType: 'local'
        }];
        localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(list));
        localStorage.setItem(LOCAL_STORAGE_INIT_KEY, 'true');
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  function saveLocalProject(projData) {
    const list = getLocalProjects();
    list.unshift(projData);
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(list));
  }

  function updateLocalProjectName(projId, newName) {
    const list = getLocalProjects();
    const proj = list.find(p => p.id === projId);
    if (proj) {
      proj.projectName = newName;
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(list));
    }
  }

  function removeLocalProject(projId) {
    let list = getLocalProjects();
    list = list.filter(p => p.id !== projId);
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(list));
  }

  function populateFirebaseForm() {
    const config = window.firebaseManager.config || {};
    if (document.getElementById('fb-apiKey')) document.getElementById('fb-apiKey').value = config.apiKey || '';
    if (document.getElementById('fb-authDomain')) document.getElementById('fb-authDomain').value = config.authDomain || '';
    if (document.getElementById('fb-projectId')) document.getElementById('fb-projectId').value = config.projectId || '';
    if (document.getElementById('fb-storageBucket')) document.getElementById('fb-storageBucket').value = config.storageBucket || '';
    if (document.getElementById('fb-appId')) document.getElementById('fb-appId').value = config.appId || '';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});

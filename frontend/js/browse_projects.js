// frontend/js/browse_projects.js
document.addEventListener('DOMContentLoaded', function() {
    const projectsListDiv = document.getElementById('projectsList');
    const loadingMessage = document.getElementById('loadingMessage'); // This is a <p> tag
    const paginationControlsDiv = document.getElementById('paginationControls');

    // Filter elements
    const searchKeywordsInput = document.getElementById('search_keywords');
    const filterCategorySelect = document.getElementById('filter_category');
    const filterBudgetSelect = document.getElementById('filter_budget');
    const filterButton = document.getElementById('filterButton');

    let currentPage = 1;
    const projectsPerPage = 9; // Or get from backend config

    // Function to show a more prominent loading state
    function showLoadingState(isLoading) {
        if (isLoading) {
            if (loadingMessage) { // Use the existing p tag for simple text
                loadingMessage.innerHTML = '<div class="spinner mx-auto"></div> <span class="loading-text">در حال بارگذاری پروژه ها...</span>';
                loadingMessage.style.display = 'block';
                loadingMessage.classList.add('text-center', 'py-8', 'col-span-full');
            }
            if (projectsListDiv) projectsListDiv.innerHTML = ''; // Clear previous projects
            if (paginationControlsDiv) paginationControlsDiv.classList.add('hidden');
        } else {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    async function fetchProjects(page = 1, filters = {}) {
        showLoadingState(true);

        let queryParams = `?page=${page}&limit=${projectsPerPage}`;
        if (filters.keywords) queryParams += `&keywords=${encodeURIComponent(filters.keywords)}`;
        if (filters.category) queryParams += `&category=${encodeURIComponent(filters.category)}`;

        if (filters.budget) {
            const budgetParts = filters.budget.split('-');
            if (budgetParts.length === 2) {
                if (budgetParts[0] !== "" && budgetParts[1] === "") { // e.g. 2000000+
                     queryParams += `&min_budget=${budgetParts[0].replace('+', '')}`;
                } else if (budgetParts[0] !== "" && budgetParts[1] !== "") {
                    queryParams += `&min_budget=${budgetParts[0]}&max_budget=${budgetParts[1]}`;
                } else if (budgetParts[0] === "" && budgetParts[1] !== "") { // Should not happen with current options
                    queryParams += `&max_budget=${budgetParts[1]}`;
                }
            }
        }
        // Add sorting params if implemented
        // queryParams += `&sort_by=date_desc`;

        try {
            const response = await fetch(`backend/php/get_projects.php${queryParams}`);
            const result = await response.json();

            if (loadingMessage) loadingMessage.style.display = 'none';

            if (result.success && result.projects) {
                if (result.projects.length > 0) {
                    displayProjects(result.projects);
                    setupPagination(result.pagination);
                } else {
                    projectsListDiv.innerHTML = `<p class="text-gray-600 col-span-full text-center py-8">${result.message || 'هیچ پروژه ای یافت نشد.'}</p>`;
                }
            } else {
                projectsListDiv.innerHTML = `<p class="text-red-500 col-span-full text-center py-8">خطا در بارگذاری پروژه ها: ${result.message || 'خطای سرور'}</p>`;
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            if (loadingMessage) loadingMessage.style.display = 'none';
            projectsListDiv.innerHTML = '<p class="text-red-500 col-span-full text-center py-8">خطا در ارتباط با سرور.</p>';
        }
    }

    function displayProjects(projects) {
        projectsListDiv.innerHTML = ''; // Clear before adding new ones
        projects.forEach(project => {
            const projectCard = `
                <div class="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-blue-700 mb-1 truncate">
                            <a href="project_details.html?id=${project.project_id}" class="hover:underline">${project.title}</a>
                        </h3>
                        <p class="text-xs text-gray-500 mb-2">
                            ثبت شده توسط: <a href="user_profile.html?id=${project.client_id /* Assuming client_id is available */}" class="text-blue-500">${project.client_username || 'کاربر'}</a>
                            - ${project.created_at_formatted}
                        </p>
                        <p class="text-sm text-gray-600 mb-3 h-20 overflow-hidden leading-relaxed">
                            ${project.description_short}
                        </p>
                        <div class="mb-2 text-sm">
                            <span class="font-semibold">بودجه:</span>
                            <span class="text-green-600 font-bold">${project.budget_formatted}</span>
                        </div>
                        ${project.deadline ? `
                        <div class="mb-3 text-sm">
                            <span class="font-semibold">مهلت:</span>
                            <span class="text-red-600">${project.deadline_formatted}</span>
                        </div>` : ''}
                        <div class="mb-3 text-sm">
                            <span class="font-semibold">مهارت ها:</span>
                            ${project.tags ? project.tags.split(',').map(tag => `<span class="text-xs inline-block py-1 px-2 bg-gray-200 text-gray-700 rounded-full mr-1 mb-1">${tag.trim()}</span>`).join('') : '<span class="text-gray-400">مشخص نشده</span>'}
                        </div>
                    </div>
                    <div class="mt-auto pt-2 border-t border-gray-200">
                        <a href="project_details.html?id=${project.project_id}"
                           class="block text-center w-full mt-2 text-blue-600 hover:text-blue-800 font-semibold py-2 px-3 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors duration-200">
                            مشاهده جزئیات و ارسال پیشنهاد &rarr;
                        </a>
                    </div>
                </div>
            `;
            projectsListDiv.insertAdjacentHTML('beforeend', projectCard);
        });
    }

    function setupPagination(paginationData) {
        if (!paginationData || paginationData.totalPages <= 1) {
            paginationControlsDiv.classList.add('hidden');
            return;
        }
        paginationControlsDiv.classList.remove('hidden');
        paginationControlsDiv.innerHTML = ''; // Clear existing controls

        const { currentPage, totalPages } = paginationData;

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = 'قبلی';
        prevButton.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r disabled:opacity-50';
        if (currentPage === 1) prevButton.disabled = true;
        prevButton.addEventListener('click', () => fetchProjects(currentPage - 1, getCurrentFilters()));
        paginationControlsDiv.appendChild(prevButton);

        // Page Numbers (simplified: just current page info)
        const pageInfo = document.createElement('span');
        pageInfo.className = 'px-4 py-2';
        pageInfo.textContent = `صفحه ${currentPage} از ${totalPages}`;
        paginationControlsDiv.appendChild(pageInfo);

        // Could add more complex page number links here

        // Next Button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = 'بعدی';
        nextButton.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l disabled:opacity-50';
        if (currentPage === totalPages) nextButton.disabled = true;
        nextButton.addEventListener('click', () => fetchProjects(currentPage + 1, getCurrentFilters()));
        paginationControlsDiv.appendChild(nextButton);
    }

    function getCurrentFilters() {
        const filters = {};
        if (searchKeywordsInput.value) filters.keywords = searchKeywordsInput.value;
        if (filterCategorySelect.value) filters.category = filterCategorySelect.value;
        if (filterBudgetSelect.value) filters.budget = filterBudgetSelect.value;
        return filters;
    }

    if (filterButton) {
        filterButton.addEventListener('click', () => {
            currentPage = 1; // Reset to first page when filters change
            fetchProjects(currentPage, getCurrentFilters());
        });
    }

    // Also allow Enter key in search input to trigger filter
    if (searchKeywordsInput) {
        searchKeywordsInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission if it's part of a form
                filterButton.click();
            }
        });
    }


    // Initial fetch of projects
    fetchProjects(currentPage, getCurrentFilters());

    // auth_ui.js should handle nav links visibility based on login status.
    // The general DOMContentLoaded listener in auth_ui.js will take care of common elements.
});

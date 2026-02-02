let selectedItemId = null;
let allContacts = [];

const typeIcons = {
    address: '🏠',
    email: '✉️',
    company: '🏢',
    notes: '📝',
    dob: '🎂'
};

async function loadCards() {
    try {
        const response = await fetch('./contacts');
        if(!response.ok)
        {
            showToast("Error:", "failed to load contacts.", "failed")
        }
        else
        {
            showToast("Success:", "successfully loaded conact list.", "ok")
        }
        allContacts = await response.json();
        renderList(allContacts);
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function renderList(contacts) {
    const container = document.getElementById('card-container');
    
    // קונטיינר ראשי שתופס את כל גובה הסיידבר
    let html = `<div class="sidebar-layout">`;

    // שכבה 1: כפתור הוספה (קבוע למעלה)
    html += `
        <div class="sticky-header">
            <li class="list-one card-item add-contact-btn" id="btn-add-new">
                <h3 class="card-title">+ Add Contact</h3>
            </li>
        </div>`;

    // שכבה 2: רשימה נגללת (האמצע)
    html += `<div class="scroll-area">`;
    html += contacts.map(item => `
        <li class="list-two card-item ${selectedItemId == item.id ? 'selected' : ''}" data-id="${item.id}">
            <h3 class="card-title">${item.first_name} ${item.last_name}</h3>
            <p class="card-description">${item.phone_number}</p>
        </li>
    `).join('');
    html += `</div>`;

    // שכבה 3: כפתור אקספורט (קבוע למטה)
    html += `
        <div class="sticky-footer">
            <li class="list-three card-item add-contact-btn" id="btn-export">
                <h3 class="card-title">export contacts 📦</h3>
            </li>
        </div>`;
    
    html += `</div>`; 
    container.innerHTML = html;
}


function searchContacts(query) {
    const filtered = allContacts.filter(c => 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
        c.phone_number.includes(query)
    );
    renderList(filtered);
}

document.addEventListener('click', async (e) => {
    const card = e.target.closest('.card-item');
    const actionBtn = e.target.closest('button');
    const customFieldBtn = e.target.closest('.custom-field-create-btn');
    const fieldEditBtn = e.target.closest('.edit-field-btn');
    const fieldDeleteBtn = e.target.closest('.delete-field-btn');

    if (card && !actionBtn && !customFieldBtn && !fieldEditBtn && !fieldDeleteBtn) {
        if (card.id === 'btn-add-new') openContactModal();
        if (card.id === 'btn-export') downloadFileFromUrl("/export-contacts",Date.now().toString() + " contacts export.csv");
        else selectContact(card.dataset.id);
    }

    if (actionBtn) {
        const id = actionBtn.dataset.id;
        if (actionBtn.classList.contains('btn-edit')) openContactModal(id);
        if (actionBtn.classList.contains('btn-delete')) openConfirmModal('Are you sure you want to delete this contact?', () => deleteContact(id));
    }

    if (customFieldBtn) openFieldModal(customFieldBtn.dataset.id);
    if (fieldEditBtn) openFieldModal(fieldEditBtn.dataset.contactId, fieldEditBtn.dataset.fieldId);
    if (fieldDeleteBtn) {
        const { contactId, fieldId } = fieldDeleteBtn.dataset;
        openConfirmModal('Delete this field?', () => deleteCustomField(contactId, fieldId));
    }
});

async function selectContact(id) {
    if(!id)
    {
        return;
    }
    selectedItemId = id;
    document.querySelectorAll('.card-item').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-id="${id}"]`)?.classList.add('selected');

    const response = await fetch(`./card/${id}`);
    if(!response.ok)
    {
        showToast("Error:", "failed to get contact details.", "failed")
    }
    else
    {
        showToast("Success:", "successfully selected a contact.", "ok")
    }
    const contact = await response.json();
    
    const detailsContainer = document.getElementById('details-panel');
    const fieldsHTML = contact.custom_fields?.map(f => `
        <div class="custom-field">
            <div class="field-info">
                <span>        
                    <span class="field-icon">${typeIcons[f.field_type] || '❔'}</span>
                    <strong>${f.field_name}:</strong> <span>${f.raw_data}</span>
                </span>        
                <div class="field-actions">
                    <button class="edit-field-btn" data-contact-id="${contact.id}" data-field-id="${f.id}">✏️</button>
                    <button class="delete-field-btn" data-contact-id="${contact.id}" data-field-id="${f.id}">🗑️</button>
                </div>
            </div>
        </div>
    `).join('') || '<p>No custom fields found.</p>';

    detailsContainer.innerHTML = `
        <div class="info-header">
            <h2>${contact.first_name} ${contact.last_name}</h2>
            <div class="actions">
                <button class="btn-save btn-edit" data-id="${contact.id}">Edit Profile</button>
                <button class="btn-cancel btn-delete" data-id="${contact.id}">Delete</button>
            </div>
        </div>
        <p><strong>Phone:</strong> ${contact.phone_number}</p>
        <hr>
        <h4>Additional Information</h4>
        <div class="fields-list">
            ${fieldsHTML}
            <div class="custom-field-create-btn" data-id="${contact.id}">+ Add New Field</div>
        </div>`;
}

function openConfirmModal(message, onConfirm) {
    const modalHTML = `
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-content confirm-modal">
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-yes-btn">Delete</button>
                    <button class="btn-save" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('confirm-yes-btn').onclick = () => {
        onConfirm();
        closeModal();
    };
}

function openContactModal(id = null) {
    const contact = id ? allContacts.find(c => c.id == id) : null;
    const modalHTML = `
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-content">
                <h3>${id ? 'Edit Profile' : 'New Contact'}</h3>
                <input type="text" id="fname" placeholder="First Name" value="${contact?.first_name || ''}">
                <input type="text" id="lname" placeholder="Last Name" value="${contact?.last_name || ''}">
                <input type="tel" id="phone" placeholder="Phone Number" value="${contact?.phone_number || ''}">
                <button class="btn-save" id="modal-save-btn">Save</button>
                <button class="btn-cancel" onclick="closeModal()">Cancel</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('modal-save-btn').onclick = () => saveContact(id);
}

async function openFieldModal(contactId, fieldId = null) {
    let fieldData = null;
    if (fieldId) {
        const response = await fetch(`./card/${contactId}`);
        if (!response.ok)
        {
            showToast("Error:", "failed to fetch contact!", "failed")
        }
        else
        {
            showToast("Success:", "successfully fetched contact.", "ok")
        }
        const contact = await response.json();
        fieldData = contact.custom_fields.find(f => f.id == fieldId);
    }

    const modalHTML = `
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-content">
                <h3>${fieldId ? 'Edit Field' : 'Add Custom Field'}</h3>
                <input type="text" id="field-name" placeholder="Label" value="${fieldData?.field_name || ''}">
                <select id="field-type">
                    <option value="email" ${fieldData?.field_type === 'email' ? 'selected' : ''}>Email ${typeIcons["email"]}</option>
                    <option value="address" ${fieldData?.field_type === 'address' ? 'selected' : ''}>Address ${typeIcons["address"]}</option>
                    <option value="company" ${fieldData?.field_type === 'company' ? 'selected' : ''}>Company ${typeIcons["company"]}</option>
                    <option value="notes" ${fieldData?.field_type === 'notes' ? 'selected' : ''}>Notes ${typeIcons["notes"]}</option>
                    <option value="dob" ${fieldData?.field_type === 'dob' ? 'selected' : ''}>Birthday ${typeIcons["dob"]}</option>
                </select>
                <input type="text" id="field-value" placeholder="Value" value="${fieldData?.raw_data || ''}">
                <button class="btn-save" id="field-save-btn">Save Field</button>
                <button class="btn-cancel" onclick="closeModal()">Cancel</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('field-save-btn').onclick = () => saveCustomField(contactId, fieldId);
}

async function saveContact(id = null) {
    const data = {
        first_name: document.getElementById('fname').value,
        last_name: document.getElementById('lname').value,
        phone_number: document.getElementById('phone').value
    };
        res = await fetch(id ? `./update-contact/${id}` : './create-contact', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok)
    {
        t = await res.text()
        if(!id && t == "duplicate contact")
        {
            showToast("Warning:", "a contact in this name already exists!", "warning")
        }
        showToast("Error:", "failed to save contact!", "failed")
    }
    else
    {
        showToast("Success:", "successfully updated contact.", "ok")
    }
    closeModal();
    loadCards();
}

async function saveCustomField(contactId, fieldId = null) {
    const data = {
        field_name: document.getElementById('field-name').value,
        type: document.getElementById('field-type').value,
        raw_data: document.getElementById('field-value').value
    };
    const url = fieldId ? `./contact/${contactId}/custom-field/${fieldId}` : `./contact/${contactId}/custom-field`;
    response = await fetch(url, {
        method: fieldId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if(!response.ok)
    {
        showToast("Error:", "failed to save custom feild.", "failed")
    }
    else
    {
        showToast("Success:", "successfully updated custom feild.", "ok")
    }
    closeModal();
    selectContact(contactId);
}

async function deleteContact(id) {
    response = await fetch(`./delete-contact/${id}`, { method: 'DELETE' });
    if(!response.ok)
    {
        showToast("Error:", "failed to get contact details.", "failed")
    }
    else
    {
        showToast("Success:", "successfully deleted contact.", "ok")
    }
    document.getElementById('details-panel').innerHTML = '<p>Contact deleted.</p>';
    loadCards();
}

async function deleteCustomField(contactId, fieldId) {
    response = await fetch(`./contact/${contactId}/custom-field/${fieldId}`, { method: 'DELETE' });
    if(!response.ok)
    {
        showToast("Error:", "failed to delete custom feild.", "failed")
    }
    else
    {
        showToast("Success:", "successfully deleted custom field.", "ok")
    }
    selectContact(contactId);
}

function closeModal() { document.getElementById('modal-overlay')?.remove(); }

function downloadFileFromUrl(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || '');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
}




function showToast(title, content, severity, show_timeout=5000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found!');
        return;
    }

    const toast = document.createElement('div');
    toast.classList.add('toast', severity);
    
    // Create the HTML structure for the toast message
    toast.innerHTML = `
        <div>
            <strong>${title}</strong>
            <p>${content}</p>
        </div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">&times;</button>
    `;

    container.appendChild(toast);

    // Show the toast message with a slight delay for the transition to work
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Automatically remove the toast after 3 seconds (adjust as needed)
    const timer = setTimeout(() => {
        removeToast(toast);
    }, show_timeout);

    // Store the timeout ID on the toast element to clear if closed manually
    toast.timeoutId = timer;
}

function removeToast(toast) {
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    toast.classList.remove('show');
    toast.classList.add('hide');

    // Remove the element from the DOM after the transition is complete
    setTimeout(() => {
        toast.remove();
    }, 500); // Matches the CSS transition duration
}


loadCards();

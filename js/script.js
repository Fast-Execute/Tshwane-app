// ============================================
// Tshwane Bus Fare Points Refill App
// JavaScript Functionality
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Main initialization function
function initializeApp() {
    setupPointsRefillForm();
    setupPaymentMethods();
    setupNavigation();
    setupDynamicContent();
}

// ============================================
// Points Refill Form Handling
// ============================================

function setupPointsRefillForm() {
    const radioButtons = document.querySelectorAll('input[name="amount"]');
    const customAmount = document.getElementById('customAmount');
    const amountDisplay = document.getElementById('amountDisplay');
    const pointsDisplay = document.getElementById('pointsDisplay');

    if (!radioButtons.length) return; // Not on refill page

    // Handle preset amount selection
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (customAmount) {
                customAmount.value = '';
            }
            updateAmountDisplay(this.value, this.dataset.points);
        });
    });

    // Handle custom amount input
    if (customAmount) {
        customAmount.addEventListener('input', function() {
            // Deselect radio buttons when custom amount is entered
            radioButtons.forEach(radio => radio.checked = false);
            
            if (this.value) {
                const customPoints = Math.floor(this.value * 10); // 1 point = R 0.10
                updateAmountDisplay(this.value, customPoints);
            }
        });
    }

    // Initialize with default value
    const checkedRadio = document.querySelector('input[name="amount"]:checked');
    if (checkedRadio) {
        updateAmountDisplay(checkedRadio.value, checkedRadio.dataset.points);
    }
}

function updateAmountDisplay(amount, points) {
    const amountDisplay = document.getElementById('amountDisplay');
    const pointsDisplay = document.getElementById('pointsDisplay');
    const confirmAmount = document.getElementById('confirmAmount');
    const confirmPoints = document.getElementById('confirmPoints');

    if (amountDisplay) {
        amountDisplay.textContent = `R ${parseFloat(amount).toFixed(2)}`;
    }
    if (pointsDisplay) {
        pointsDisplay.textContent = `${parseInt(points).toLocaleString()} pts`;
    }
    if (confirmAmount) {
        confirmAmount.textContent = `R ${parseFloat(amount).toFixed(2)}`;
    }
    if (confirmPoints) {
        confirmPoints.textContent = `${parseInt(points).toLocaleString()} pts`;
    }
}

// ============================================
// Payment Method Handling
// ============================================

function setupPaymentMethods() {
    const cardPaymentRadio = document.getElementById('cardPayment');
    const cardDetails = document.getElementById('cardDetails');
    const bankPaymentRadio = document.getElementById('bankPayment');
    const mobilePaymentRadio = document.getElementById('mobilePayment');
    const paymentMethodSelects = document.querySelectorAll('input[name="paymentMethod"]');

    if (!paymentMethodSelects.length) return; // Not on refill page

    paymentMethodSelects.forEach(radio => {
        radio.addEventListener('change', function() {
            const method = this.value;
            const confirmMethod = document.getElementById('confirmMethod');

            // Hide card details by default
            if (cardDetails) {
                cardDetails.style.display = this.id === 'cardPayment' ? 'block' : 'none';
            }

            // Update confirmation modal
            if (confirmMethod) {
                const methodText = {
                    'card': 'Debit/Credit Card',
                    'bank': 'Bank Transfer',
                    'mobile': 'Mobile Money'
                };
                confirmMethod.textContent = methodText[method];
            }
        });
    });

    // Initialize card details visibility
    if (cardPaymentRadio && cardPaymentRadio.checked && cardDetails) {
        cardDetails.style.display = 'block';
    }
}

// ============================================
// Navigation
// ============================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// ============================================
// Dynamic Content Updates
// ============================================

function setupDynamicContent() {
    // Update last updated timestamp
    updateLastUpdated();
    
    // Format currency values
    formatCurrency();
    
    // Generate transaction ID
    if (document.getElementById('transId')) {
        document.getElementById('transId').textContent = generateTransactionId();
    }
}

function updateLastUpdated() {
    const timestamp = document.querySelector('[data-timestamp]');
    if (timestamp) {
        const now = new Date();
        timestamp.textContent = now.toLocaleTimeString();
    }
}

function formatCurrency() {
    const currencyElements = document.querySelectorAll('[data-currency]');
    currencyElements.forEach(element => {
        const value = parseFloat(element.dataset.currency);
        element.textContent = new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR'
        }).format(value);
    });
}

function generateTransactionId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `#TRX${timestamp}${random}`;
}

// ============================================
// Form Validation
// ============================================

function validateCardForm() {
    const cardNumber = document.querySelector('input[placeholder="1234 5678 9012 3456"]');
    const cardholderName = document.querySelector('input[placeholder="John Doe"]');
    const expiry = document.querySelector('input[placeholder="MM/YY"]');
    const cvv = document.querySelector('input[placeholder="123"]');

    if (!cardNumber || !cardholderName || !expiry || !cvv) {
        return true; // Not on card payment page
    }

    let isValid = true;
    const errors = [];

    // Validate cardholder name
    if (!cardholderName.value || cardholderName.value.length < 3) {
        errors.push('Please enter a valid cardholder name');
        isValid = false;
    }

    // Validate card number (basic)
    const cardNum = cardNumber.value.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cardNum)) {
        errors.push('Please enter a valid card number');
        isValid = false;
    }

    // Validate expiry date
    if (!/^\d{2}\/\d{2}$/.test(expiry.value)) {
        errors.push('Please enter expiry date in MM/YY format');
        isValid = false;
    }

    // Validate CVV
    if (!/^\d{3,4}$/.test(cvv.value)) {
        errors.push('Please enter a valid CVV');
        isValid = false;
    }

    if (!isValid) {
        showValidationError(errors);
    }

    return isValid;
}

function showValidationError(errors) {
    const errorMessage = errors.join('\n');
    alert('Please correct the following errors:\n\n' + errorMessage);
}

// ============================================
// Card Number Formatting
// ============================================

function formatCardNumber(input) {
    if (!input) return;
    
    input.addEventListener('input', function() {
        let value = this.value.replace(/\s/g, '');
        let formattedValue = '';
        
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        
        this.value = formattedValue;
    });
}

// ============================================
// Modal Helpers
// ============================================

function handleConfirmPayment() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    
    if (!paymentMethod) {
        alert('Please select a payment method');
        return false;
    }

    if (paymentMethod.value === 'card') {
        return validateCardForm();
    }

    return true;
}

// ============================================
// Utility Functions
// ============================================

function formatPhoneNumber(input) {
    if (!input) return;
    
    input.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, '');
        
        if (value.length >= 10) {
            this.value = '+27 ' + value.slice(1).replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
        }
    });
}

// ============================================
// Animation Helpers
// ============================================

function animateValueChange(element, startValue, endValue, duration = 1000) {
    const startNum = parseInt(startValue.replace(/[^0-9]/g, ''));
    const endNum = parseInt(endValue.replace(/[^0-9]/g, ''));
    const range = endNum - startNum;
    const increment = range / (duration / 16);
    let current = startNum;
    let start = null;

    function update(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        current = Math.floor(startNum + range * progress);

        element.textContent = current.toLocaleString() + ' pts';

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// Logging & Debugging
// ============================================

function logTransaction(data) {
    console.log('Transaction Initiated:', {
        timestamp: new Date(),
        amount: data.amount,
        points: data.points,
        method: data.method,
        status: 'pending'
    });
}

// ============================================
// Error Handling
// ============================================

window.addEventListener('error', function(e) {
    console.error('Application Error:', e.error);
    // In production, send error to server
});

// ============================================
// Export Functions for Global Use
// ============================================

window.handleConfirmPayment = handleConfirmPayment;
window.formatCardNumber = formatCardNumber;
window.formatPhoneNumber = formatPhoneNumber;

const SUPABASE_URL = 'https://ezwcaslpgvwcejtpvpli.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6d2Nhc2xwZ3Z3Y2VqdHB2cGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMzg0NzIsImV4cCI6MjA4MzcxNDQ3Mn0.QWga5i2CSpENbJdzvnRFJitHpdw7yrmqfr36_Kk7r6o';

// Fetch and display waitlist count
async function fetchWaitlistCount() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact',
        'Range': '0-0',
      },
    });

    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      const el = document.getElementById('waitlist-count');
      if (total && parseInt(total) > 0 && el) {
        el.textContent = `${total} ${parseInt(total) === 1 ? 'person has' : 'people have'} joined the waitlist`;
      }
    }
  } catch (err) {
    // Silently fail
  }
}

// Handle waitlist form submission
async function handleWaitlistSubmit(form) {
  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  const messageEl = form.querySelector('.form-message');

  const email = input.value.trim();
  if (!email) return;

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  messageEl.textContent = '';
  messageEl.className = 'form-message';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      messageEl.textContent = "You're on the list! We'll be in touch soon.";
      messageEl.className = 'form-message success';
      input.value = '';
      fetchWaitlistCount();
    } else if (res.status === 409) {
      messageEl.textContent = "You're already on the waitlist!";
      messageEl.className = 'form-message success';
    } else {
      const data = await res.json();
      if (data?.message?.includes('duplicate') || data?.code === '23505') {
        messageEl.textContent = "You're already on the waitlist!";
        messageEl.className = 'form-message success';
      } else {
        throw new Error(data.message || 'Something went wrong');
      }
    }
  } catch (err) {
    messageEl.textContent = err.message || 'Something went wrong. Please try again.';
    messageEl.className = 'form-message error';
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

// Attach to all waitlist forms
document.querySelectorAll('.waitlist-form').forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleWaitlistSubmit(form);
  });
});

// Intersection Observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px',
});

document.querySelectorAll('.fade-in').forEach((el) => {
  observer.observe(el);
});

// Load waitlist count
fetchWaitlistCount();

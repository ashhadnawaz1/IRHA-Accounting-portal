/* ==========================================================================
   IRHA Accounting Portal — Add Client wizard
   Plain JS, no build step. State lives in memory for the session.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     State
     --------------------------------------------------------------------- */
  const state = {
    customerSeq: 1,     // -> CUST-0001, CUST-0002 ...
    clientSeq: 1,        // -> CLT-0001 ...
    customerId: null,
    clientId: null,
    kyc: { fullName: "", businessName: "", email: "", phone: "", address: "", taxId: "", services: [] },
    caseData: { services: [], package: "Standard", price: 9999, paymentMode: "Bank Transfer", total: 0 }
  };

  /* ---------------------------------------------------------------------
     Element refs
     --------------------------------------------------------------------- */
  const el = (id) => document.getElementById(id);

  const step1Form = el("step1");
  const step2Form = el("step2");
  const stepSoon  = el("stepSoon");
  const step4Panel = el("step4");

  const stepperItems = Array.from(document.querySelectorAll(".stepper__item"));
  const toastBox = el("toast");

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  function pad4(n) { return String(n).padStart(4, "0"); }

  function showToast(msg) {
    toastBox.textContent = msg;
    toastBox.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastBox.classList.remove("is-visible"), 2600);
  }

  function switchPanel(target) {
    [step1Form, step2Form, stepSoon, step4Panel].forEach((p) => p.classList.add("is-hidden"));
    if (target === "1") step1Form.classList.remove("is-hidden");
    if (target === "2") step2Form.classList.remove("is-hidden");
    if (target === "soon") stepSoon.classList.remove("is-hidden");
    if (target === "4") step4Panel.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setStepperState(stepNum, status) {
    // status: 'active' | 'done' | 'locked' | 'soon'
    const item = stepperItems.find((i) => i.dataset.step === String(stepNum));
    if (!item) return;
    item.classList.remove("is-active", "is-done", "is-locked", "is-soon");
    item.classList.add("is-" + status);
    const btn = item.querySelector(".stepper__btn");
    btn.disabled = status === "locked";
  }

  function updateMiniSteps(currentStep) {
    document.querySelectorAll(".dossier__mini-steps li").forEach((li) => {
      const n = Number(li.dataset.mini);
      li.classList.remove("is-complete", "is-current");
      if (n < currentStep) li.classList.add("is-complete");
      else if (n === currentStep) li.classList.add("is-current");
    });
  }

  /* ---------------------------------------------------------------------
     Live dossier sync while filling Step 1
     --------------------------------------------------------------------- */
  function syncDossierFromStep1() {
    const name = el("fullName").value.trim();
    const business = el("businessName").value.trim();
    const phone = el("phone").value.trim();
    const services = Array.from(step1Form.querySelectorAll('input[name="services"]:checked')).map((c) => c.value);

    el("factName").textContent = name || "—";
    el("factBusiness").textContent = business || "—";
    el("factPhone").textContent = phone || "—";
    el("factServices").textContent = services.length ? services.join(", ") : "—";
  }

  step1Form.addEventListener("input", syncDossierFromStep1);
  step1Form.addEventListener("change", syncDossierFromStep1);

  /* ---------------------------------------------------------------------
     STEP 1 — KYC Form submit -> generate Customer ID
     --------------------------------------------------------------------- */
  step1Form.addEventListener("submit", function (e) {
    e.preventDefault();

    const services = Array.from(step1Form.querySelectorAll('input[name="services"]:checked')).map((c) => c.value);
    const servicesError = el("servicesError");

    if (services.length === 0) {
      servicesError.classList.add("is-visible");
      return;
    }
    servicesError.classList.remove("is-visible");

    if (!step1Form.checkValidity()) {
      step1Form.reportValidity();
      return;
    }

    // Capture KYC data
    state.kyc = {
      fullName: el("fullName").value.trim(),
      businessName: el("businessName").value.trim(),
      email: el("email").value.trim(),
      phone: el("phone").value.trim(),
      address: el("address").value.trim(),
      taxId: el("taxId").value.trim(),
      services
    };

    // Generate Customer ID
    state.customerId = "CUST-" + pad4(state.customerSeq);

    // Stamp it into the dossier stub
    const stub = el("custStub");
    el("stubCustId").textContent = state.customerId;
    el("stubCustStatus").textContent = "customer created";
    stub.classList.add("is-issued");

    // Unlock + populate Step 2
    el("lockedCustId").textContent = state.customerId;
    el("lockedName").textContent = state.kyc.fullName;
    el("lockedBusiness").textContent = state.kyc.businessName;
    el("lockedPhone").textContent = state.kyc.phone;
    el("lockedEmail").textContent = state.kyc.email;

    renderConfirmServices(state.kyc.services);
    recalcPayment();

    // Stepper transitions
    setStepperState(1, "done");
    setStepperState(2, "active");

    switchPanel("2");
    updateMiniSteps(2);
    showToast(`Customer ${state.customerId} created — locked into this case.`);
  });

  /* ---------------------------------------------------------------------
     STEP 2 — Add Client (services confirm + package + payment)
     --------------------------------------------------------------------- */
  function renderConfirmServices(preselected) {
    const wrap = el("confirmServices");
    wrap.innerHTML = "";
    const allServices = ["Bookkeeping", "Payroll", "GST Filing", "Income Tax", "Audit & Assurance", "ROC Compliance"];
    allServices.forEach((service) => {
      const label = document.createElement("label");
      label.className = "chip";
      const checked = preselected.includes(service) ? "checked" : "";
      label.innerHTML = `<input type="checkbox" name="confirmServices" value="${service}" ${checked}><span>${service}</span>`;
      wrap.appendChild(label);
    });
    wrap.addEventListener("change", recalcPayment);
  }

  function recalcPayment() {
    const selectedPackage = step2Form.querySelector('input[name="package"]:checked');
    const price = selectedPackage ? Number(selectedPackage.dataset.price) : 0;
    const packageName = selectedPackage ? selectedPackage.value : "—";

    const services = Array.from(el("confirmServices").querySelectorAll("input:checked")).map((c) => c.value);
    const addons = services.length * 500;
    const subtotal = price + addons;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    el("sumPackage").textContent = "₹" + price.toLocaleString("en-IN");
    el("sumAddons").textContent = "₹" + addons.toLocaleString("en-IN");
    el("sumTax").textContent = "₹" + tax.toLocaleString("en-IN");
    el("sumTotal").textContent = "₹" + total.toLocaleString("en-IN");

    el("factPackage").textContent = packageName;
    el("factTotal").textContent = "₹" + total.toLocaleString("en-IN") + "/mo";

    state.caseData = {
      services,
      package: packageName,
      price,
      paymentMode: el("paymentMode").value,
      total
    };
  }

  step2Form.querySelectorAll('input[name="package"]').forEach((r) => r.addEventListener("change", recalcPayment));
  el("paymentMode").addEventListener("change", recalcPayment);

  el("backToStep1").addEventListener("click", function () {
    setStepperState(2, "locked");
    setStepperState(1, "active");
    switchPanel("1");
    updateMiniSteps(1);
  });

  step2Form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (state.caseData.services.length === 0) {
      showToast("Confirm at least one service before creating the case.");
      return;
    }

    // Case created — CLT is intentionally NOT generated here.
    setStepperState(2, "done");
    setStepperState(3, "soon");
    setStepperState(4, "locked");

    switchPanel("soon");
    updateMiniSteps(3);
    showToast(`Case created for ${state.customerId} — awaiting Quotation → Compliance.`);
  });

  el("backFromSoon").addEventListener("click", function () {
    setStepperState(3, "locked");
    setStepperState(2, "active");
    switchPanel("2");
    updateMiniSteps(2);
  });

  /* ---------------------------------------------------------------------
     STEP 3 (popup) — Quotation -> Invoice -> Receipt -> Compliance
     --------------------------------------------------------------------- */
  const modalOverlay = el("modalOverlay");
  const modalTabs = Array.from(document.querySelectorAll("#modalTabs li"));
  const modalStages = Array.from(document.querySelectorAll(".modal-stage"));
  const modalBack = el("modalBack");
  const modalNext = el("modalNext");
  const modalProgress = el("modalProgress");
  let modalStage = 1;
  const docSeq = { quote: 1, invoice: 1, receipt: 1 };

  function todayStr(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function openModal() {
    // Populate Quotation from current case data
    el("quoteNo").textContent = "QUO-" + pad4(docSeq.quote);
    el("quoteCustomer").textContent = `${state.kyc.fullName} (${state.customerId})`;
    el("quotePackage").textContent = state.caseData.package;
    el("quoteServices").textContent = state.caseData.services.join(", ") || "—";
    el("quoteTotal").textContent = "₹" + state.caseData.total.toLocaleString("en-IN");

    // Populate Invoice
    el("invoiceNo").textContent = "INV-" + pad4(docSeq.invoice);
    el("invoiceDate").textContent = todayStr(0);
    el("invoiceDue").textContent = todayStr(7);
    el("invoiceTotal").textContent = "₹" + state.caseData.total.toLocaleString("en-IN");

    // Populate Receipt
    el("receiptNo").textContent = "RCT-" + pad4(docSeq.receipt);
    el("receiptMode").textContent = state.caseData.paymentMode;
    el("receiptTotal").textContent = "₹" + state.caseData.total.toLocaleString("en-IN");

    setModalStage(1);
    modalOverlay.classList.add("is-open");
  }

  function closeModal() {
    modalOverlay.classList.remove("is-open");
  }

  function setModalStage(n) {
    modalStage = n;
    modalTabs.forEach((tab) => {
      const s = Number(tab.dataset.stage);
      tab.classList.remove("is-active", "is-complete");
      if (s < n) tab.classList.add("is-complete");
      if (s === n) tab.classList.add("is-active");
    });
    modalStages.forEach((stage) => {
      stage.classList.toggle("is-active", Number(stage.dataset.modalStage) === n);
    });
    modalBack.style.visibility = n === 1 ? "hidden" : "visible";
    modalNext.textContent = n === 4 ? "Approve & Create Client ID →" : "Next →";
    modalProgress.textContent = `Stage ${n} of 4`;
  }

  el("openPopup").addEventListener("click", openModal);
  el("modalClose").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });

  modalBack.addEventListener("click", () => { if (modalStage > 1) setModalStage(modalStage - 1); });

  modalNext.addEventListener("click", function () {
    if (modalStage === 3 && !el("paymentConfirmed").checked) {
      showToast("Confirm payment before generating the receipt.");
      return;
    }
    if (modalStage === 4) {
      const checks = Array.from(document.querySelectorAll(".compliance-check"));
      const allChecked = checks.every((c) => c.checked);
      if (!allChecked) {
        el("complianceError").classList.add("is-visible");
        return;
      }
      el("complianceError").classList.remove("is-visible");
      approveComplianceAndIssueClientId();
      return;
    }
    setModalStage(modalStage + 1);
  });

  function approveComplianceAndIssueClientId() {
    state.clientId = "CLT-" + pad4(state.clientSeq);

    // Stamp Client ID into the dossier
    const stub = el("clientStub");
    el("stubClientId").textContent = state.clientId;
    el("stubClientStatus").textContent = "compliance approved";
    stub.classList.add("is-issued");

    // Populate Step 4 summary
    el("finalClientId").textContent = state.clientId;
    el("finalCustomerName").textContent = state.kyc.fullName;
    el("finalSummary").innerHTML = `
      <div class="doc-card__row"><span>Customer ID</span><span class="mono">${state.customerId}</span></div>
      <div class="doc-card__row"><span>Package</span><span>${state.caseData.package}</span></div>
      <div class="doc-card__row"><span>Services</span><span>${state.caseData.services.join(", ")}</span></div>
      <div class="doc-card__row doc-card__row--total"><span>Total billed</span><span>₹${state.caseData.total.toLocaleString("en-IN")}</span></div>
    `;

    closeModal();
    setStepperState(3, "done");
    setStepperState(4, "done");
    switchPanel("4");
    updateMiniSteps(5); // marks all four as complete
    showToast(`${state.clientId} issued — client onboarding complete.`);
  }

  /* ---------------------------------------------------------------------
     Reset — start a new client
     --------------------------------------------------------------------- */
  el("startNewClient").addEventListener("click", function () {
    state.customerSeq += 1;
    state.clientSeq += 1;
    state.customerId = null;
    state.clientId = null;

    step1Form.reset();
    step2Form.reset();
    document.querySelectorAll(".compliance-check, #paymentConfirmed").forEach((c) => (c.checked = false));
    el("servicesError").classList.remove("is-visible");
    el("complianceError").classList.remove("is-visible");

    el("stubCustId").textContent = "— — — —";
    el("stubCustStatus").textContent = "awaiting KYC";
    el("custStub").classList.remove("is-issued");

    el("stubClientId").textContent = "— — — —";
    el("stubClientStatus").textContent = "issued only after Compliance";
    el("clientStub").classList.remove("is-issued");

    ["factName", "factBusiness", "factPhone", "factServices", "factPackage", "factTotal"].forEach((id) => (el(id).textContent = "—"));

    setStepperState(1, "active");
    setStepperState(2, "locked");
    setStepperState(3, "locked");
    setStepperState(4, "locked");

    switchPanel("1");
    updateMiniSteps(1);
  });

  /* ---------------------------------------------------------------------
     Stepper navigation (done steps are clickable; locked/soon show info)
     --------------------------------------------------------------------- */
  stepperItems.forEach((item) => {
    const btn = item.querySelector(".stepper__btn");
    btn.addEventListener("click", function () {
      if (item.classList.contains("is-locked")) return;

      const target = item.dataset.step;
      if (target === "3") {
        switchPanel("soon");
        updateMiniSteps(3);
        return;
      }
      switchPanel(target);
      updateMiniSteps(Number(target));
    });
  });

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  updateMiniSteps(1);
})();
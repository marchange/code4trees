import html2pdf from 'html2pdf.js'

export async function downloadCertificatePdf(el, filename) {
  const width = el.scrollWidth
  // html2pdf's page-fit math is sensitive to sub-pixel rounding between the
  // measured DOM size and the rendered canvas, which can spill a sliver onto
  // an unwanted 2nd page. A generous safety margin sidesteps that reliably.
  const height = el.scrollHeight * 1.15

  await html2pdf()
    .set({
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { backgroundColor: '#050a07' },
      jsPDF: { unit: 'px', format: [width, height], orientation: 'landscape' },
      pagebreak: { mode: 'avoid-all' }
    })
    .from(el)
    .save()
}

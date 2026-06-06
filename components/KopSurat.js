export default function KopSurat({ school }) {
  if (!school) return null;

  return (
    <>
      <style>{`
        .kop-surat-print { display: none; }

        @media print {
          @page {
            size: 215mm 330mm;
            margin: 20mm;
          }

          .kop-surat-print {
            display: block !important;
            width: 100%;
            margin-bottom: 0;
            font-family: "Times New Roman", Times, serif;
          }

          .navbar, .sidebar, .mobile-nav,
          .no-print, .page-header, .breadcrumb,
          .card-header button, .btn, .filter-card {
            display: none !important;
          }

          .main-content   { padding: 0 !important; }
          .page-container { padding: 0 !important; max-width: 100% !important; }
          .card           { box-shadow: none !important; border: none !important; }
          .table-wrapper  {
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="kop-surat-print">

        {/* ══ BARIS 1: Logo kiri | Teks tengah | Logo kanan ══
            Logo sejajar dengan baris Kemenag + Kantor + Nama + NPSN/NSM
            Alamat ditaruh di baris terpisah di bawah, full width              */}
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          marginBottom: 0,
        }}>
          <colgroup>
            {/* Lebar kolom logo disesuaikan:
                Kemenag (landscape) lebih lebar, NW (square) lebih kecil */}
            <col style={{ width: "76pt" }} />
            <col />
            <col style={{ width: "58pt" }} />
          </colgroup>
          <tbody>
            <tr>

              {/* ── Logo Kemenag kiri: landscape (lebar > tinggi) ── */}
              <td style={{ verticalAlign: "middle", textAlign: "center", padding: "0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-kemenag.png"
                  alt="Logo Kemenag"
                  style={{
                    width: "65pt",   /* lebar lebih dari tinggi → proporsional */
                    height: "52pt",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                  onError={(e) => { e.target.style.visibility = "hidden"; }}
                />
              </td>

              {/* ── Teks tengah ── */}
              <td style={{
                textAlign: "center",
                verticalAlign: "middle",
                padding: "0 6pt",
                lineHeight: 1.5,
                overflow: "hidden",
              }}>
                <div style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                  Kementerian Agama Republik Indonesia
                </div>

                {school.kabupaten && (
                  <div style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Kantor Kementerian Agama Kabupaten {school.kabupaten}
                  </div>
                )}

                <div style={{ fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.02em", margin: "1pt 0", whiteSpace: "nowrap" }}>
                  {school.nama}
                </div>

                {(school.npsn || school.nsm) && (
                  <div style={{ fontSize: "10pt", fontWeight: "bold", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                    {school.npsn && `NPSN : ${school.npsn}`}
                    {school.npsn && school.nsm && (
                      <span style={{ display: "inline-block", width: "2em" }} />
                    )}
                    {school.nsm && `NSM : ${school.nsm}`}
                  </div>
                )}
              </td>

              {/* ── Logo NW kanan: square, lebih kecil ── */}
              <td style={{ verticalAlign: "middle", textAlign: "center", padding: "0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-nw.png"
                  alt="Logo NW"
                  style={{
                    width: "48pt",   /* square, tidak terlalu besar */
                    height: "48pt",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                  onError={(e) => { e.target.style.visibility = "hidden"; }}
                />
              </td>

            </tr>
          </tbody>
        </table>

        {/* ══ BARIS 2: Alamat full width, center, TANPA garis bawah teks ══ */}
        {school.alamat && (
          <div style={{
            textAlign: "center",
            fontSize: "9pt",
            fontStyle: "italic",
            fontWeight: "bold",
            padding: "3pt 0 2pt",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            /* TIDAK ada borderBottom di sini — garis bawah adalah garis KOP di bawah */
          }}>
            Alamat : {school.alamat}
          </div>
        )}

        {/* ══ GARIS KOP: tipis — tebal — tipis (3 garis) ══ */}
        <hr style={{ border: "none", borderTop: "0.75pt solid black", margin: "0" }} />
        <hr style={{ border: "none", borderTop: "2.5pt solid black",  margin: "1.5pt 0" }} />
        <hr style={{ border: "none", borderTop: "0.75pt solid black", margin: "0 0 8pt" }} />

      </div>
    </>
  );
}
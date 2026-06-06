"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  Menu,
  School,
  BookOpen,
  FileText,
  BarChart3,
  CalendarDays,
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const mainMenus = [
    { href: "/dashboard", label: "Home",    icon: LayoutDashboard },
    { href: "/kelas",     label: "Kelas",   icon: Users           },
    { href: "/siswa",     label: "Siswa",   icon: GraduationCap   },
    { href: "/absensi",   label: "Absensi", icon: ClipboardCheck  },
  ];

  const moreMenus = [
    { href: "/sekolah",   label: "Sekolah",   icon: School      },
    { href: "/jadwal",    label: "Jadwal",    icon: CalendarDays },
    { href: "/penilaian", label: "Penilaian", icon: BookOpen    },
    { href: "/jurnal",    label: "Jurnal",    icon: FileText    },
    { href: "/rekap",     label: "Rekap",     icon: BarChart3   },
  ];

  return (
    <>
      <nav className="mobile-nav">
        {mainMenus.map((menu) => {
          const Icon = menu.icon;
          const active =
            pathname === menu.href ||
            pathname.startsWith(menu.href + "/");
          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`mobile-nav-link ${active ? "active" : ""}`}
            >
              <Icon />
              <span>{menu.label}</span>
            </Link>
          );
        })}

        {/* Tombol Lainnya */}
        <button
          type="button"
          className={`mobile-nav-link ${
            moreMenus.some(
              (m) => pathname === m.href || pathname.startsWith(m.href + "/")
            )
              ? "active"
              : ""
          }`}
          onClick={() => setShowMore(true)}
        >
          <Menu />
          <span>Lainnya</span>
        </button>
      </nav>

      {showMore && (
        <>
          <div
            className="mobile-menu-backdrop"
            onClick={() => setShowMore(false)}
          />
          <div className="mobile-menu-sheet">
            <div className="mobile-menu-title">Menu Lainnya</div>
            {moreMenus.map((menu) => {
              const Icon = menu.icon;
              const active =
                pathname === menu.href ||
                pathname.startsWith(menu.href + "/");
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="mobile-menu-item"
                  onClick={() => setShowMore(false)}
                  style={{
                    borderLeft: active
                      ? "3px solid var(--clr-primary-600)"
                      : "3px solid transparent",
                    color: active ? "var(--clr-primary-700)" : "var(--clr-text)",
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontWeight: active ? 700 : 500 }}>
                    {menu.label}
                  </span>
                </Link>
              );
            })}
            <button
              className="btn btn-secondary"
              onClick={() => setShowMore(false)}
            >
              Tutup
            </button>
          </div>
        </>
      )}
    </>
  );
}
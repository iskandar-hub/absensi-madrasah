"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  FileText,
  BarChart3,
  CalendarDays,
} from "lucide-react";

export default function Sidebar({ open }) {
  const pathname = usePathname();

  const menus = [
    { title: "Dashboard",  href: "/dashboard", icon: LayoutDashboard },
    { title: "Sekolah",    href: "/sekolah",   icon: School          },
    { title: "Kelas",      href: "/kelas",     icon: Users           },
    { title: "Siswa",      href: "/siswa",     icon: GraduationCap   },
    { title: "Jadwal",     href: "/jadwal",    icon: CalendarDays    },
    { title: "Absensi",    href: "/absensi",   icon: ClipboardCheck  },
    { title: "Penilaian",  href: "/penilaian", icon: BookOpen        },
    { title: "Jurnal Guru",href: "/jurnal",    icon: FileText        },
    { title: "Rekap",      href: "/rekap",     icon: BarChart3       },
  ];

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-group">
        <div className="sidebar-group-label">MENU UTAMA</div>
        {menus.map((menu) => {
          const Icon = menu.icon;
          const active =
            pathname === menu.href ||
            pathname.startsWith(menu.href + "/");
          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon className="icon" />
              <span>{menu.title}</span>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", padding: "12px" }}>
        <div
          className="card"
          style={{
            background:
              "linear-gradient(135deg,var(--clr-primary-700),var(--clr-primary-600))",
            border: "none",
          }}
        >
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Image
                src="/logo-nw.png"
                alt="Logo NW"
                width={32}
                height={32}
              />
              <div>
                <div style={{ color: "#fff", fontWeight: 700 }}>
                  Absensi Madrasah
                </div>
                <div style={{ color: "rgba(255,255,255,.8)", fontSize: "11px" }}>
                  Ponpes Tarbiyatunnasyi'in NW
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
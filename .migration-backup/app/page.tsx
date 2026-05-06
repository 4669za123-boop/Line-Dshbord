"use client"

import { useEffect, useState } from "react"
import { Sidebar, type PageType } from "@/components/dashboard/sidebar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { AddLinePage } from "@/components/dashboard/add-line-page"
import { NotificationSettingsPage } from "@/components/dashboard/notification-settings-page"
import type { Website, AddLineFormPayload } from "@/components/dashboard/types"
import type { LineAccount } from "@/components/dashboard/line-card"

const WEBSITES_STORAGE_KEY = "line-mgmt-websites"
const ACCOUNTS_STORAGE_KEY = "line-mgmt-accounts"

function loadWebsitesFromStorage(): Website[] {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(WEBSITES_STORAGE_KEY)
        : null
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (w): w is Website =>
          w !== null &&
          typeof w === "object" &&
          typeof (w as Website).id === "string" &&
          typeof (w as Website).name === "string",
      )
      .map((w) => ({ id: w.id, name: w.name.trim() }))
      .filter((w) => w.name.length > 0)
  } catch {
    return []
  }
}

function isLineChannelStatus(
  x: unknown,
): x is LineAccount["mainStatus"] {
  return x === "normal" || x === "suspended" || x === "inactive"
}

function isLineRole(x: unknown): x is LineAccount["lineRole"] {
  return x === "main" || x === "deposit"
}

function loadAccountsFromStorage(): LineAccount[] {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
        : null
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const out: LineAccount[] = []
    for (const row of parsed) {
      if (row === null || typeof row !== "object") continue
      const r = row as Record<string, unknown>
      const id = r.id
      const name = r.name
      const websiteId = r.websiteId
      let websiteName = r.websiteName
      const rawLineRole = r.lineRole
      const lineRole: LineAccount["lineRole"] = isLineRole(rawLineRole) ? rawLineRole : "main"
      const mainStatus = r.mainStatus
      const depositStatus = r.depositStatus

      if (
        typeof id !== "string" ||
        typeof name !== "string" ||
        typeof websiteId !== "string"
      ) {
        continue
      }

      if (typeof websiteName !== "string") websiteName = ""

      if (!isLineChannelStatus(mainStatus) || !isLineChannelStatus(depositStatus)) {
        continue
      }

      out.push({
        id,
        name: name.trim(),
        websiteId,
        websiteName: String(websiteName).trim(),
        lineRole,
        mainStatus,
        depositStatus,
      })
    }
    return out.filter((a) => a.name.length > 0)
  } catch {
    return []
  }
}

export default function DashboardPage() {
  const [activePage, setActivePage] = useState<PageType>("dashboard")
  const [websites, setWebsites] = useState<Website[]>([])
  const [accounts, setAccounts] = useState<LineAccount[]>([])
  const [persistReady, setPersistReady] = useState(false)

  useEffect(() => {
    setWebsites(loadWebsitesFromStorage())
    setAccounts(loadAccountsFromStorage())
    setPersistReady(true)
  }, [])

  useEffect(() => {
    if (!persistReady) return
    window.localStorage.setItem(WEBSITES_STORAGE_KEY, JSON.stringify(websites))
  }, [websites, persistReady])

  useEffect(() => {
    if (!persistReady) return
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
  }, [accounts, persistReady])

  const handleAddWebsite = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setWebsites((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed },
    ])
  }

  const handleRemoveWebsite = (id: string) => {
    setWebsites((prev) => prev.filter((w) => w.id !== id))
    setAccounts((prev) => prev.filter((a) => a.websiteId !== id))
  }

  const handleAddLine = async (p: AddLineFormPayload) => {
    const trimmed = p.lineIdentifier.trim()
    if (!trimmed) return

    const site = websites.find((w) => w.id === p.websiteId)
    if (!site) return

    try {
      await fetch("/api/add-line", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: trimmed,
          type: p.role === "main" ? "หลัก" : "ฝากถอน",
          site: site.name,
        }),
      })
    } catch (err) {
      console.log("API ERROR:", err)
    }

    const next: LineAccount = {
      id: crypto.randomUUID(),
      name: trimmed,
      websiteId: site.id,
      websiteName: site.name,
      lineRole: p.role,
      mainStatus: p.role === "main" ? "normal" : "inactive",
      depositStatus: p.role === "deposit" ? "normal" : "inactive",
    }

    setAccounts((prev) => {
      const rest = prev.filter(
        (a) => !(a.websiteId === site.id && a.lineRole === p.role),
      )
      return [...rest, next]
    })
  }

  const dashboard = (
    <DashboardContent
      websites={websites}
      accounts={accounts}
      onAddWebsite={handleAddWebsite}
      onRemoveWebsite={handleRemoveWebsite}
    />
  )

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return dashboard
      case "add-line":
        return (
          <AddLinePage
            websites={websites}
            onAddLine={handleAddLine}
            onNavigateDashboard={() => setActivePage("dashboard")}
          />
        )
      case "notification-settings":
        return <NotificationSettingsPage />
      default:
        return dashboard
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="transition-opacity duration-300">
        {renderPage()}
      </div>
    </div>
  )
}
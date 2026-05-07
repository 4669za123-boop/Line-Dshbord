export type Website = {
  id: string
  name: string
  url?: string
}

export type AddLineFormPayload = {
  lineIdentifier: string
  websiteId: string
  websiteName: string
  role: "main" | "deposit"
}

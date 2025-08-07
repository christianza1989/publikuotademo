import { signIn, signOut } from "@/auth"
import { Button } from "./ui/button"

export function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("google")
      }}
    >
      <Button type="submit">Prisijungti su Google</Button>
    </form>
  )
}

export function SignOut() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <Button type="submit" variant="outline">
        Atsijungti
      </Button>
    </form>
  )
}

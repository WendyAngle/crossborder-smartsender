import { createContext } from "react";

// Kept in a separate module so HMR of the provider or consumers never
// creates a second context identity (which blanks the preview).
export const PhoneCardContext = createContext<unknown>(null);

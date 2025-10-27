import "@prisma/client";

declare module "@prisma/client" {
  interface Event {
    showTabDescription: boolean;
    showTabResources: boolean;
    showTabClassification: boolean;
    showTabChronicle: boolean;
    showTabGallery: boolean;
    showTabLocation: boolean;
  }
}

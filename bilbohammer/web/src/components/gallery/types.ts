export type GalleryPhotoComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  storagePath: string;
  width: number;
  height: number;
  createdAt: string;
  title?: string;
  takenAt?: string;
  location?: string;
  likes: number;
  comments: GalleryPhotoComment[];
};

export type GalleryAlbum = {
  id: string;
  slug: string;
  title: string;
  date: string | null;
  dateISO: string | null;
  location: string | null;
  description: string | null;
  coverImage: string | null;
  totalPhotos: number;
  tags: string[];
  facets: {
    year: string;
    game: string;
    format: string;
  };
  images: GalleryImage[];
  albumComments: GalleryPhotoComment[];
  collaborators?: Array<{ id: string; name: string }>;
};

export type GalleryStandalonePhoto = {
  id: string;
  image: GalleryImage;
  facets: {
    year: string;
    game: string;
    format: string;
  };
};

export type GalleryViewerEntry = {
  album?: GalleryAlbum;
  image: GalleryImage;
  kind: "album" | "standalone";
};

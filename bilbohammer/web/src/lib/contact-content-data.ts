export type WhatsappEntry = {
  id: string;
  role: string;
  name: string;
  phone: string;
  note?: string | null;
  whatsappUrl?: string | null;
};

export type ContactPageContent = {
  intro: string;
  whatsapp: {
    description: string;
    entries: WhatsappEntry[];
    community?: {
      label: string;
      url: string;
      description?: string | null;
    } | null;
  };
  instagram: {
    description: string;
    handle: string;
    url: string;
  };
  email: {
    description: string;
    address: string;
  };
  discord: {
    description: string;
    inviteUrl: string;
  };
  visit: {
    description: string;
    schedule: {
      title: string;
      lines: string[];
    };
    access: {
      title: string;
      lines: string[];
    };
  };
  membership: {
    intro: string;
    requirements: string;
    pricing: string;
    benefits: string;
  };
};

export const CONTACT_CONTENT_DEFAULT: ContactPageContent = {
  intro:
    "Estamos pendientes del correo, redes y grupos del club para ayudarte con reservas, eventos o cualquier duda que tengas.",
  whatsapp: {
    description:
      "Si necesitas una respuesta rapida o coordinar una quedada, puedes escribir a la junta por WhatsApp o telefono.",
    entries: [
      {
        id: "presidencia",
        role: "Presidencia",
        name: "Nerea",
        phone: "+34 600 000 000",
        note: "Atiende consultas generales del club.",
        whatsappUrl: "https://wa.me/34600000000",
      },
      {
        id: "eventos",
        role: "Eventos",
        name: "Iker",
        phone: "+34 611 111 111",
        note: "Reservas de mesa y coordinación de torneos.",
        whatsappUrl: "https://wa.me/34611111111",
      },
    ],
    community: {
      label: "Comunidad de WhatsApp",
      url: "https://chat.whatsapp.com/tu-enlace",
      description: "Pide acceso cuando vengas al local para entrar en el grupo general del club.",
    },
  },
  instagram: {
    description: "Noticias, fotos de partidas y previa de nuestros próximos eventos.",
    handle: "@bilbohammerclub",
    url: "https://www.instagram.com/bilbohammerclub/",
  },
  email: {
    description: "Para gestiones formales, altas de socios y propuestas de colaboración.",
    address: "bilbohammer@gmail.com",
  },
  discord: {
    description:
      "Servidor interno para publicar listas, compartir cronicas y montar partidas con la comunidad socia.",
    inviteUrl: "https://discord.gg/bilbohammer",
  },
  visit: {
    description:
      "Comparte tu plan de visita por correo o WhatsApp. Así coordinamos mejor la apertura del local y la escenografía.",
    schedule: {
      title: "Horarios habituales",
      lines: ["Jueves y viernes de 18:30 a 22:30", "Sabados de 10:00 a 14:00 segun actividad"],
    },
    access: {
      title: "Acceso",
      lines: [
        "Edificio con ascensor y rampa en la entrada",
        "Aparcamiento gratuito en calles cercanas",
      ],
    },
  },
  membership: {
    intro:
      "Cuentanos tu experiencia, que juegos te interesan y si buscas ligas, partidas casuales o un sitio donde pintar.",
    requirements:
      "Ser mayor de 16 años o venir acompañado de una persona adulta socia. Compartir los valores del club y respetar el espacio común.",
    pricing:
      "La cuota es de 15 euros al mes. Ofrecemos modalidad trimestral y descuentos si colaboras de forma recurrente con eventos o escenografía.",
    benefits:
      "Acceso al local, armarios comunitarios, material escenico y participacion en ligas internas, campanas narrativas y talleres exclusivos.",
  },
};

export function cloneContactContent(
  source: ContactPageContent = CONTACT_CONTENT_DEFAULT,
): ContactPageContent {
  return JSON.parse(JSON.stringify(source)) as ContactPageContent;
}

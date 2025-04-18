export interface Service {
    id: number;
    slug: string;
    imageSrc: string;
    serviceName: string;
    price: string;
    description: string;
    longDescription: string;
  }
  
  export const services: Service[] = [
    {
      id: 1,
      slug: 'botolinoterapiya',
      imageSrc: '/services/bottocs.jpeg',
      serviceName: 'Ботолинотерапия',
      price: '150₽',
      description: 'бла бла бла блаблаблабла',
      longDescription: `Ботулинотерапия — это инновационный метод лечения, который 
      позволяет добиться стойкого расслабления мышц и уменьшения спазмов.
      Наши специалисты применяют только сертифицированные препараты и
      индивидуально рассчитывают дозировку для каждого пациента,
      гарантируя безопасность и эффективность процедуры.`,
    },
    {
      id: 2,
      slug: 'pediatr',
      imageSrc: '/services/bottocs.jpeg',
      serviceName: 'Педиатр',
      price: '200₽',
      description: 'блабалбал блаблаб блабла',
      longDescription: `Ботулинотерапия — это инновационный метод лечения, который 
      позволяет добиться стойкого расслабления мышц и уменьшения спазмов.
      Наши специалисты применяют только сертифицированные препараты и
      индивидуально рассчитывают дозировку для каждого пациента,
      гарантируя безопасность и эффективность процедуры.`,
    },
    {
      id: 3,
      slug: 'snus',
      imageSrc: '/services/bottocs.jpeg',
      serviceName: 'Снюс',
      price: '100₽',
      description: 'блябляблябялбял',
      longDescription: `Ботулинотерапия — это инновационный метод лечения, который 
      позволяет добиться стойкого расслабления мышц и уменьшения спазмов.
      Наши специалисты применяют только сертифицированные препараты и
      индивидуально рассчитывают дозировку для каждого пациента,
      гарантируя безопасность и эффективность процедуры.`,
    },
    {
      id: 4,
      slug: 'terapiya',
      imageSrc: '/services/bottocs.jpeg',
      serviceName: 'Терапия',
      price: '250₽',
      description: 'качественная терапия для вас',
      longDescription: `Ботулинотерапия — это инновационный метод лечения, который 
      позволяет добиться стойкого расслабления мышц и уменьшения спазмов.
      Наши специалисты применяют только сертифицированные препараты и
      индивидуально рассчитывают дозировку для каждого пациента,
      гарантируя безопасность и эффективность процедуры.`,
    },
  ];
  
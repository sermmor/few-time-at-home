import React from 'react';
import { useTranslation } from 'react-i18next';

export const NotFound = () => {
  const { t } = useTranslation();
  return <>{t('notFound.title')}</>;
};

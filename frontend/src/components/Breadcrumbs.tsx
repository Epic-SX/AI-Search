'use client';

import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  sx?: any;
}

/**
 * A reusable breadcrumbs component that properly integrates Next.js Link with MUI Link
 * to avoid nested anchor tag issues.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, sx }) => {
  return (
    <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 2, ...sx }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        if (isLast) {
          return (
            <Typography key={index} color="text.primary">
              {item.label}
            </Typography>
          );
        }
        
        return (
          <Link key={index} href={item.href || '#'} passHref legacyBehavior>
            <MuiLink underline="hover" color="inherit">
              {item.label}
            </MuiLink>
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs; 
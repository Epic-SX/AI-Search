import React from 'react';
import { Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CustomBreadcrumbsProps {
  items: BreadcrumbItem[];
}

const CustomBreadcrumbs: React.FC<CustomBreadcrumbsProps> = ({ items }) => {
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        if (isLast) {
          return (
            <Typography key={index} color="text.primary">
              {item.label}
            </Typography>
          );
        }
        
        return item.href ? (
          <Link key={index} href={item.href} passHref legacyBehavior>
            <MuiLink color="inherit" underline="hover">
              {item.label}
            </MuiLink>
          </Link>
        ) : (
          <Typography key={index} color="text.primary">
            {item.label}
          </Typography>
        );
      })}
    </Breadcrumbs>
  );
};

export default CustomBreadcrumbs; 
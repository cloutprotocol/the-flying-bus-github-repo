import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FeatureArticleImage from '../FeatureArticleImage';

describe('FeatureArticleImage - Graceful Image Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Missing Image URL', () => {
    it('should show fallback background when no imageUrl is provided', () => {
      render(<FeatureArticleImage title="Test Article" />);
      
      // Should show fallback gradient background
      const fallbackDiv = document.querySelector('.bg-gradient-to-br');
      expect(fallbackDiv).toBeInTheDocument();
      expect(fallbackDiv).toHaveClass('from-flyingbus-blue', 'via-purple-600', 'to-pink-500');
      
      // Should show newspaper icon
      expect(screen.getByText('📰')).toBeInTheDocument();
      
      // Should not show img element
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should show fallback background when imageUrl is empty string', () => {
      render(<FeatureArticleImage imageUrl="" title="Test Article" />);
      
      // Should show fallback gradient background
      const fallbackDiv = document.querySelector('.bg-gradient-to-br');
      expect(fallbackDiv).toBeInTheDocument();
      
      // Should not show img element
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('Image Loading States', () => {
    it('should show loading state initially when image is provided', () => {
      render(<FeatureArticleImage imageUrl="https://example.com/image.jpg" title="Test Article" />);
      
      // Should show loading placeholder
      const loadingDiv = document.querySelector('.animate-pulse');
      expect(loadingDiv).toBeInTheDocument();
      expect(loadingDiv).toHaveClass('bg-gray-200');
      
      // Image should be hidden initially
      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveStyle({ display: 'none' });
    });

    it('should show image after successful load', async () => {
      render(<FeatureArticleImage imageUrl="https://example.com/image.jpg" title="Test Article" />);
      
      const img = screen.getByRole('img', { hidden: true });
      
      // Simulate successful image load
      fireEvent.load(img);
      
      await waitFor(() => {
        expect(img).toHaveStyle({ display: 'block' });
      });
      
      // Loading placeholder should be gone
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  describe('Image Error Handling', () => {
    it('should show fallback background when image fails to load', async () => {
      render(<FeatureArticleImage imageUrl="https://example.com/broken-image.jpg" title="Test Article" />);
      
      const img = screen.getByRole('img', { hidden: true });
      
      // Simulate image load error
      fireEvent.error(img);
      
      await waitFor(() => {
        // Should show fallback gradient background
        const fallbackDiv = document.querySelector('.bg-gradient-to-br');
        expect(fallbackDiv).toBeInTheDocument();
        expect(fallbackDiv).toHaveClass('from-flyingbus-blue', 'via-purple-600', 'to-pink-500');
      });
      
      // Should show newspaper icon
      expect(screen.getByText('📰')).toBeInTheDocument();
      
      // Loading placeholder should be gone
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });

    it('should handle multiple error events gracefully', async () => {
      render(<FeatureArticleImage imageUrl="https://example.com/broken-image.jpg" title="Test Article" />);
      
      const img = screen.getByRole('img', { hidden: true });
      
      // Simulate multiple error events
      fireEvent.error(img);
      fireEvent.error(img);
      fireEvent.error(img);
      
      await waitFor(() => {
        // Should still show fallback background
        const fallbackDiv = document.querySelector('.bg-gradient-to-br');
        expect(fallbackDiv).toBeInTheDocument();
      });
      
      // Should show newspaper icon only once
      const icons = screen.getAllByText('📰');
      expect(icons).toHaveLength(1);
    });
  });

  describe('Responsive Layout', () => {
    it('should maintain proper dimensions with fallback background', () => {
      render(<FeatureArticleImage title="Test Article" />);
      
      const container = document.querySelector('.relative.w-full');
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({
        height: 'calc(100svh - var(--header-height) - 5rem)',
        minHeight: '450px',
        maxHeight: '700px'
      });
    });

    it('should maintain proper dimensions with loaded image', async () => {
      render(<FeatureArticleImage imageUrl="https://example.com/image.jpg" title="Test Article" />);
      
      const img = screen.getByRole('img', { hidden: true });
      fireEvent.load(img);
      
      await waitFor(() => {
        expect(img).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full', 'object-cover');
      });
      
      const container = document.querySelector('.relative.w-full');
      expect(container).toHaveStyle({
        height: 'calc(100svh - var(--header-height) - 5rem)',
        minHeight: '450px',
        maxHeight: '700px'
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper alt text for images', () => {
      render(<FeatureArticleImage imageUrl="https://example.com/image.jpg" title="Test Article Title" />);
      
      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('alt', 'Test Article Title');
    });

    it('should maintain accessibility when showing fallback', () => {
      render(<FeatureArticleImage title="Test Article Title" />);
      
      // Should not have img element when showing fallback
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      
      // Should have visual indicator (newspaper icon)
      expect(screen.getByText('📰')).toBeInTheDocument();
    });
  });

  describe('Visual Consistency', () => {
    it('should always show gradient overlay for text readability', () => {
      render(<FeatureArticleImage imageUrl="https://example.com/image.jpg" title="Test Article" />);
      
      // Should have gradient overlay for text readability
      const overlay = document.querySelector('.bg-gradient-to-t.from-black\\/90');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('absolute', 'inset-0');
    });

    it('should show gradient overlay even with fallback background', () => {
      render(<FeatureArticleImage title="Test Article" />);
      
      // Should have gradient overlay for text readability
      const overlay = document.querySelector('.bg-gradient-to-t.from-black\\/90');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('absolute', 'inset-0');
    });
  });
});
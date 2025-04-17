
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ArticleNotFound = () => {
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-3xl font-display font-bold mb-4">Article Not Found</h1>
      <p className="mb-8">Sorry, we couldn't find the article you're looking for.</p>
      <Button asChild>
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
};

export default ArticleNotFound;

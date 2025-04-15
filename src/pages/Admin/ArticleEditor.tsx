
import React from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import ArticleForm from '@/components/Admin/ArticleEditor/ArticleForm';
import { useLocation, useParams } from 'react-router-dom';

const ArticleEditor = () => {
  const { articleId } = useParams();
  const location = useLocation();
  const isNewArticle = !articleId;
  const articleType = location.state?.articleType || 'standard';

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNewArticle ? 'Create New Article' : 'Edit Article'}
          </h1>
          <p className="text-muted-foreground">
            {isNewArticle
              ? 'Create a new article for publication'
              : 'Make changes to your article'}
          </p>
        </div>
        
        <ArticleForm 
          articleId={articleId} 
          articleType={articleType}
          isNewArticle={isNewArticle}
        />
      </div>
    </AdminPortalLayout>
  );
};

export default ArticleEditor;

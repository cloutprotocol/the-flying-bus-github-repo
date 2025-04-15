
import React from 'react';
import { ArticleProps } from './ArticleCard';
import FeatureArticleImage from './FeatureArticleImage';
import FeatureArticleHeader from './FeatureArticleHeader';
import FeatureArticleFooter from './FeatureArticleFooter';

const FeatureArticle = (props: ArticleProps) => {
  return (
    <article className="relative rounded-lg overflow-hidden shadow-md group w-full">
      <FeatureArticleImage imageUrl={props.imageUrl} title={props.title} />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
        <FeatureArticleHeader 
          title={props.title}
          category={props.category}
          readingLevel={props.readingLevel}
        />
        
        <p className="text-white/90 mb-3 max-w-3xl text-sm md:text-base line-clamp-2">
          {props.excerpt}
        </p>
        
        <FeatureArticleFooter 
          id={props.id}
          author={props.author}
          date={props.date}
          publishDate={props.publishDate}
        />
      </div>
    </article>
  );
};

export default FeatureArticle;

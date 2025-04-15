
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { getArticleById, isStoryboardArticle } from '@/data/articles';
import { Button } from '@/components/ui/button';
import ArticleHeader from '@/components/Articles/ArticleHeader';
import ArticleContent from '@/components/Articles/ArticleContent';
import ArticleSidebar from '@/components/Articles/ArticleSidebar';
import ArticleFooter from '@/components/Articles/ArticleFooter';
import { getCommentsByArticleId } from '@/data/comments';

const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const article = getArticleById(articleId || '');

  // If it's a storyboard article, redirect to the StoryboardPage
  useEffect(() => {
    if (article && isStoryboardArticle(article)) {
      navigate(`/storyboard/${article.id}`);
    }
  }, [article, navigate]);

  if (!article) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Article Not Found</h1>
          <p className="mb-8">Sorry, we couldn't find the article you're looking for.</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // If this is a storyboard article, we'll show a loading state briefly before redirect
  if (isStoryboardArticle(article)) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p>Loading storyboard series...</p>
        </div>
      </MainLayout>
    );
  }

  // Get the actual comment count from our mock data
  const comments = getCommentsByArticleId(article.id);
  const articleWithComments = {
    ...article,
    commentCount: comments.length
  };

  // Check if this is a debate article - both "Debate" and "Debates" are considered valid
  const isDebate = article.category.toLowerCase() === 'debate' || article.category.toLowerCase() === 'debates';

  // We'll pass specific debate settings if this is a debate article
  const debateSettings = isDebate ? {
    initialVotes: { yes: 67, no: 33 } // These would come from the backend in a real application
  } : undefined;

  const articleContent = `
    <h1>Kids from Around the World Unite for Climate Change Action</h1>
    
    <p>Young activists from over 20 countries participated in a virtual summit to discuss and propose solutions for climate change. Their innovative ideas are gaining attention from world leaders and environmental organizations globally.</p>
    
    <h2>A Global Movement Led by Youth</h2>
    
    <p>The two-day event, organized entirely by students aged 10-14, featured presentations on renewable energy, waste reduction, and conservation efforts that kids can lead in their communities. Participants joined from six continents, representing diverse perspectives and local environmental challenges.</p>
    
    <blockquote>
      "We may be young, but we understand what's happening to our planet. Climate change will affect our future more than anyone else's, so we deserve a voice in how it's addressed," said 12-year-old organizer Mia Johnson.
    </blockquote>
    
    <p>The summit was conducted entirely online, which not only reduced the carbon footprint of the event but also allowed for greater participation from young people in remote or economically disadvantaged areas.</p>
    
    <h3>Key Issues Addressed</h3>
    
    <p>The young activists focused on several critical environmental issues during their discussions:</p>
    
    <ul>
      <li><strong>Renewable Energy Solutions</strong> - Students presented affordable solar and wind power projects that could be implemented in schools</li>
      <li><strong>Plastic Pollution</strong> - Innovative ideas for reducing single-use plastics in daily life</li>
      <li><strong>Food Waste Reduction</strong> - Strategies for composting and mindful consumption</li>
      <li><strong>Habitat Conservation</strong> - Local projects to protect endangered species and their ecosystems</li>
    </ul>
    
    <p>Each topic was approached with both global perspective and localized solutions that could be implemented by kids in their own communities, regardless of resources available.</p>
    
    <h4>Community-Based Initiatives</h4>
    
    <p>Participants shared projects they've already started in their own neighborhoods. These grassroots efforts have shown remarkable success with minimal resources:</p>
    
    <ol>
      <li>Community gardens that provide fresh produce while sequestering carbon</li>
      <li>School-wide recycling programs that have diverted tons of waste from landfills</li>
      <li>Energy conservation challenges that reduced electricity usage by up to 25%</li>
      <li>Educational campaigns that have increased environmental awareness among peers</li>
    </ol>
    
    <figure>
      <img src="https://images.unsplash.com/photo-1621451537984-a935a96fdbcc?w=600&auto=format&fit=crop" alt="Kids planting trees in a community garden" />
      <figcaption>Summit participants from Brazil planting native trees as part of their local conservation project.</figcaption>
    </figure>
    
    <h5>Political Engagement</h5>
    
    <p>The summit culminated in a joint declaration addressed to world leaders, calling for more ambitious climate targets and greater inclusion of young voices in environmental policy discussions. The document was co-signed by all participating students and has been sent to political representatives in each of their countries.</p>
    
    <pre><code>// Example of the summit's impact calculation
function calculateCarbonOffset(trees, years) {
  return trees * 21.7 * years; // kg of CO2
}

// 5000 trees planted by summit participants over 10 years
calculateCarbonOffset(5000, 10); // = 1,085,000 kg CO2 offset</code></pre>
    
    <h2>Adult Reaction and Support</h2>
    
    <p>Several political leaders and environmental experts attended the virtual event, and many came away impressed by the children's knowledge and passion.</p>
    
    <blockquote>
      "I was honestly surprised by how well these kids understand complex climate issues," said environmental scientist Dr. Eleanor Rivera. "Their solutions are practical and innovative. We adults could learn a lot from them."
    </blockquote>
    
    <p>Dr. Rivera wasn't alone in her assessment. Several attending politicians have committed to reviewing the students' proposals and incorporating them into upcoming environmental legislation.</p>
    
    <h3>Media Coverage and Public Response</h3>
    
    <p>The summit received positive coverage from major news outlets around the world. Social media hashtags related to the event trended for three consecutive days, bringing even more attention to the young environmentalists' cause.</p>
    
    <p>Public response has been overwhelmingly supportive, with many adults expressing admiration for the students' initiative and commitment. Several environmental organizations have reached out to offer mentorship and resources to help expand the youth-led projects.</p>
    
    <h2>Looking Forward: Future Plans</h2>
    
    <p>The young activists show no signs of slowing down. They've already begun planning follow-up activities:</p>
    
    <ul>
      <li>Regional mini-summits to focus on area-specific environmental challenges</li>
      <li>Monthly virtual check-ins to share progress on local projects</li>
      <li>A resource-sharing platform where students can exchange ideas and success stories</li>
      <li>A global tree-planting day with coordinated events across all participating countries</li>
    </ul>
    
    <p>"This is just the beginning," Johnson emphasized. "We're building a movement that will continue growing as more kids realize they have the power to make a difference."</p>
    
    <h2>How You Can Get Involved</h2>
    
    <p>The group has created a website where other kids can learn about climate issues and join local action groups. To participate:</p>
    
    <ol>
      <li>Visit their website at <a href="#">KidsForClimateAction.org</a></li>
      <li>Join their weekly online discussions every Saturday</li>
      <li>Start a climate club at your school using their free starter guide</li>
      <li>Share your own environmental projects on their social media platforms</li>
    </ol>
    
    <p>The group welcomes participants of all ages, though leadership positions are reserved for those under 15 years old to maintain their youth-led focus.</p>
    
    <p>"Anyone can make a difference," Johnson concluded. "Even small actions add up to big changes when we all work together. The future of our planet depends on what we do today, and we're proving that kids can lead the way."</p>
  `;

  return (
    <MainLayout fullWidth>
      <div className="w-full bg-white">
        <ArticleHeader article={articleWithComments} />
        
        <div className="w-full px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
            <ArticleContent 
              article={articleWithComments} 
              articleContent={articleContent} 
              debateSettings={debateSettings}
            />
            <ArticleSidebar article={articleWithComments} />
            
            <div className="lg:col-span-8">
              <ArticleFooter article={articleWithComments} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ArticlePage;

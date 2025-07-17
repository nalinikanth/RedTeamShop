import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Rating,
  Alert,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const SearchResults = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promptResponse, setPromptResponse] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q');

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query]);

  const performSearch = async () => {
    if (!query) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to search products');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        'http://localhost:8000/api/search/',
        { query },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      // Store the prompt response
      const resultText = response.data.reply;
      setPromptResponse(resultText);
      
      // Parse the search results and extract product IDs
      const productIds = extractProductIds(resultText);
      
      if (productIds.length > 0) {
        // Fetch the suggested products
        const productsResponse = await axios.get('http://localhost:8000/api/products/');
        const allProducts = productsResponse.data;
        const suggestedProducts = allProducts.filter(product => 
          productIds.includes(product.id)
        );
        
        // If we don't have enough suggested products, add some from the original list
        if (suggestedProducts.length < 2) {
          const remainingProducts = allProducts.filter(product => 
            !productIds.includes(product.id)
          );
          suggestedProducts.push(...remainingProducts.slice(0, 2 - suggestedProducts.length));
        }

        setSearchResults(suggestedProducts.slice(0, 2)); // Limit to 2 products
      } else {
        // If no specific products found, show 2 random products
        const productsResponse = await axios.get('http://localhost:8000/api/products/');
        setSearchResults(productsResponse.data.slice(0, 2));
      }
    } catch (error) {
      console.error('Search error:', error);
      if (error.response?.status === 503) {
        setError('Search service is currently unavailable. Please try again later.');
      } else {
        setError('Failed to perform search. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const extractProductIds = (text) => {
    // Simple extraction - look for product IDs in the text
    const matches = text.match(/product\s+(\d+)/gi);
    if (matches) {
      return matches.map(match => parseInt(match.match(/\d+/)[0]));
    }
    return [];
  };

  const handleAddToCart = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add items to cart');
        return;
      }

      await axios.post('http://localhost:8000/api/cart/', {
        product_id: productId,
        quantity: 1
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      alert('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error adding to cart');
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Search Results
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Showing results for: "{query}"
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {promptResponse && (
          <Card sx={{ mb: 3, backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#495057', fontWeight: 'bold' }}>
                AI Assistant Response:
              </Typography>
              <Typography variant="body1" sx={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.6,
                color: '#495057'
              }}>
                {promptResponse}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {searchResults.length > 0 ? (
        <Grid container spacing={3}>
          {searchResults.map((product) => (
            <Grid item xs={12} sm={6} key={product.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => handleProductClick(product.id)}
              >
                <CardMedia
                  component="img"
                  height="250"
                  image={product.image_url}
                  alt={product.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography gutterBottom variant="h5" component="h2" noWrap>
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                    {product.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating value={product.rating || 0} precision={0.5} size="small" />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({product.review_count || 0} reviews)
                    </Typography>
                  </Box>
                  
                  <Typography variant="h5" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                    ${product.price}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product.id);
                    }}
                    sx={{ mt: 'auto' }}
                  >
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No products found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Try adjusting your search terms or browse our full product catalog.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Browse All Products
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default SearchResults; 
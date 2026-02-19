"use strict";

/**
 * appends params to a url
 * @param {string} data - data returned from the server's ajax call
 * @param {Object} button - button that was clicked for email sign-up
 */
function displayMessage(data, button) {
    $.spinner().stop();
    var status;
    if (data.success) {
        status = 'alert-success';
    } else {
        status = 'alert-danger';
    }

    if ($('.loyalty-message').length === 0) {
        $('body').append(
            '<div class="loyalty-message"></div>'
        );
    }
    $('.loyalty-message')
        .append('<div class="loyalty-alert text-center ' + status + '">' + data.msg + '</div>');

    setTimeout(function () {
        $('.loyalty-message').remove();
        button.removeAttr('disabled');
    }, 3000);
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(function() {
        displayMessage({success: true, msg: 'Voucher code copied to clipboard!'});
        }, function(err) {
            console.error('Failed to copy: ', err);
        });
    };

// Global function for tab switching (called from onclick in template)
window.showTab = function(tabName) {
    // Hide all tab panes
    var tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(function(pane) {
        pane.classList.remove('active');
    });
    
    // Remove active class from all nav links
    var navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
        link.classList.remove('active');
    });
    
    // Show selected tab pane
    var selectedPane = document.getElementById(tabName);
    if (selectedPane) {
        selectedPane.classList.add('active');
    }
    
    // Add active class to clicked nav link
    var clickedLink = event.target;
    clickedLink.classList.add('active');
};

module.exports = function () {
    var $body = $('body');

    $body.on('loyalty:toggle-enroll-program-member', function (e) {
        e.preventDefault();
        var $actions = $('#loyalty-program-actions');
        $actions.find('.loyalty-program-view-details').toggleClass('d-none');
        $actions.find('.loyalty-program-enroll').toggleClass('d-none');
        $actions.closest('.card-body').find('.member-status').toggleClass('d-none'); 
        displayMessage({success: true, msg: 'Member enrolled successfully'});
    });

    // Click handler for enroll button
    $body.on('click', '.enroll-program-member', function (e) {
        e.preventDefault();
        var $btn = $(this);

        // Loading state (use spinner if available)
        $.spinner().start();
        $btn.prop('disabled', true).addClass('is-loading');

        $.ajax({
            url: $(this).data('href'),
            type: 'GET',
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (res) {
            if (res && res.success) {
                // Success feedback - trigger the toggle to show member status
                $body.trigger('loyalty:toggle-enroll-program-member');
                
                // Update the UI with the new member data if available
                if (res.data) {
                    updateMemberCardUI(res.data);
                }
            } else {
                alert((res && res.message) || 'Enrollment failed');
            }
        }).fail(function (xhr) {
            var msg = (xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Enrollment failed';
            alert(msg);
        }).always(function () {
            $.spinner().stop();
            $btn.prop('disabled', false).removeClass('is-loading');
        });
    });

    // Function to update member card UI with new data
    function updateMemberCardUI(memberData) {
        // Update membership number
        $('.membership-number').text('Membership Number: ' + (memberData.membershipNumber || ''));
        
        
        // Update member status (second div in member-status)
        $('.member-status .dashboard-info div').eq(1).text('Member Status: ' + (memberData.memberStatus || ''));
        
        // Update qualifying points
        if (memberData.qualifyingPoints !== undefined) {
            $('.qualifying-points').text('Qualifying Points: ' + memberData.qualifyingPoints);
        }
        
        // Update non-qualifying points
        if (memberData.nonQualifyingPoints !== undefined) {
            $('.non-qualifying-points').text('Non-Qualifying Points: ' + memberData.nonQualifyingPoints);
        }
        
        // Update total points
        if (memberData.totalPoints !== undefined) {
            $('.total-points').text('Total Points: ' + memberData.totalPoints);
        }
        
        // Update tier
        if (memberData.tier) {
            $('.tier').text('Loyalty Tier: ' + memberData.tier);
        }
        
        // Update enrollment date
        if (memberData.enrollmentDate) {
            $('.enrollment-date').text('Enrollment Date: ' + memberData.enrollmentDate);
        }
    }

    // Voucher redemption handler
    $body.on('click', '#submitRedeemVoucher', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var pointsToRedeem = $('#pointsToRedeem').val();
        
        if (!pointsToRedeem) {
            alert('Please enter points to redeem');
            return;
        }
        
        if (parseInt(pointsToRedeem) < 1000) {
            alert('Minimum 1000 points required');
            return;
        }
        
        // Loading state
        $.spinner().start();
        // Close modal
        $('#redeemVoucherModal').modal('hide');
        $btn.prop('disabled', true).addClass('is-loading');
        
        $.ajax({
            url: $btn.data('url') + '?pointsToRedeem=' + parseInt(pointsToRedeem),
            type: 'GET',
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json'
        }).done(function (res) {
            if (res && res.success) {
                // Show success message with voucher details using toaster
                var message = 'Voucher redeemed successfully!<br>';
                message += '<strong>Voucher Code:</strong> ' + res.data.voucherCode + '<br>';
                message += '<strong>Voucher Value:</strong> $' + res.data.voucherValue + '<br>';
                message += '<strong>Points Redeemed:</strong> ' + res.data.pointsRedeemed + '<br>';
                message += '<strong>Expires:</strong> ' + res.data.expirationDate;
                
                displayMessage({success: true, msg: message});

                // Reset form
                $('#redeemVoucherForm')[0].reset();
                
                // Redirect to vouchers tab
                var currentUrl = window.location.href;
                var url = new URL(currentUrl);
                url.searchParams.set('activeTab', 'vouchers');
                window.location.href = url.toString();
            } else {
                displayMessage(res);
            }
        }).fail(function (xhr) {
            var msg = (xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Voucher redemption failed';
            displayMessage({success: false, msg: msg});
        }).always(function () {
            $.spinner().stop();
            $btn.prop('disabled', false).removeClass('is-loading');
        });
    });


};


